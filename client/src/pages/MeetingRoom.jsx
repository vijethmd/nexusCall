import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { initSocket } from "../lib/socket";
import PeerManager from "../lib/PeerManager";
import useMediaStream from "../hooks/useMediaStream";
import useScreenShare from "../hooks/useScreenShare";
import useActiveSpeaker from "../hooks/useActiveSpeaker";
import VideoGrid from "../components/meeting/VideoGrid";
import MeetingControls from "../components/meeting/MeetingControls";
import ParticipantsPanel from "../components/meeting/ParticipantsPanel";
import ChatPanel from "../components/meeting/ChatPanel";

const MeetingRoom = () => {
  const { meetingId } = useParams();
  const navigate      = useNavigate();
  const location      = useLocation();
  const { user, token } = useAuthStore();

  const initialMic   = location.state?.initialMic   ?? true;
  const initialVideo = location.state?.initialVideo ?? true;

  // Local media
  const { stream, isMicOn, isVideoOn, toggleMic, toggleVideo, forceMute } =
    useMediaStream(initialMic, initialVideo);

  const peerManagerRef = useRef(null);
  const socketRef      = useRef(null);

  // Screen share — audio:false prevents echo
  const { isSharing: isScreenSharing, shareStream: screenShareStream, toggleScreenShare, cleanup: cleanupScreen } =
    useScreenShare({ socket: socketRef.current, meetingId, peerManagerRef });

  // Active speaker
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  useActiveSpeaker({ stream, socket: socketRef.current, meetingId, isMicOn });

  // Room state
  const [participants,        setParticipants]        = useState([]);
  const [waitingRoom,         setWaitingRoom]         = useState([]);
  const [remoteStreams,       setRemoteStreams]        = useState(new Map());
  const [isHost,              setIsHost]              = useState(false);
  const [isLocked,            setIsLocked]            = useState(false);
  const [remoteScreenShareId, setRemoteScreenShareId] = useState(null);

  // UI
  const [isChatOpen,         setIsChatOpen]         = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isHandRaised,       setIsHandRaised]       = useState(false);
  const [messages,           setMessages]           = useState([]);
  const [unreadCount,        setUnreadCount]        = useState(0);
  const isChatOpenRef = useRef(false);
  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);

  // Init socket + WebRTC once stream is ready
  useEffect(() => {
    if (!stream) return;

    // Always reinit socket — handles page refresh
    const authToken = token || localStorage.getItem("token");
    if (!authToken) { navigate("/login"); return; }

    const sock = initSocket(authToken);
    socketRef.current = sock;

    peerManagerRef.current = new PeerManager({
      socket: sock,
      localStream: stream,
      onRemoteStream: (socketId, remoteStream) => {
        setRemoteStreams((prev) => new Map(prev).set(socketId, remoteStream));
      },
      onRemoteStreamRemoved: (socketId) => {
        setRemoteStreams((prev) => { const n = new Map(prev); n.delete(socketId); return n; });
      },
    });

    sock.on("room:joined", ({ isHost: h, participants: p, waitingRoom: w }) => {
      setIsHost(h);
      const remotes = p.filter((x) => x.socketId !== sock.id);
      setParticipants(remotes);
      setWaitingRoom(w || []);
      remotes.forEach((pt) => peerManagerRef.current?.createPeer(pt.socketId, true));
    });

    sock.on("participant:joined", (participant) => {
      if (participant.socketId === sock.id) return;
      setParticipants((prev) =>
        prev.find((p) => p.socketId === participant.socketId) ? prev : [...prev, participant]
      );
    });

    sock.on("participant:left", ({ socketId }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      peerManagerRef.current?.removePeer(socketId);
    });

    sock.on("waiting:new", (data) => {
      setWaitingRoom((prev) => {
        if (prev.find((p) => p.socketId === data.socketId)) return prev;
        return [...prev, data];
      });
      toast(`${data.name} is waiting to join.`);
    });

    // WebRTC signaling
    sock.on("signal:offer",         async ({ from, offer })     => peerManagerRef.current?.handleOffer(from, offer));
    sock.on("signal:answer",        async ({ from, answer })    => peerManagerRef.current?.handleAnswer(from, answer));
    sock.on("signal:ice-candidate", async ({ from, candidate }) => peerManagerRef.current?.handleIceCandidate(from, candidate));

    // Media updates — video and audio are separate events
    sock.on("participant:media-update", ({ socketId, isMuted, isVideoOff }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === socketId
            ? {
                ...p,
                ...(isMuted    !== undefined && { isMuted }),
                ...(isVideoOff !== undefined && { isVideoOff }),
              }
            : p
        )
      );
    });

    sock.on("participant:hand-raise", ({ socketId, isHandRaised }) => {
      setParticipants((prev) =>
        prev.map((p) => p.socketId === socketId ? { ...p, isHandRaised } : p)
      );
    });

    sock.on("participant:speaking", ({ socketId, isSpeaking }) => {
      setActiveSpeakerId((prev) => isSpeaking ? socketId : prev === socketId ? null : prev);
    });

    sock.on("host:force-mute", () => { forceMute(); toast("You were muted by the host."); });
    sock.on("host:kicked", ({ message }) => { toast.error(message); navigate("/dashboard"); });

    sock.on("screen:started", ({ socketId }) => setRemoteScreenShareId(socketId));
    sock.on("screen:stopped", ({ socketId }) => {
      setRemoteScreenShareId((prev) => prev === socketId ? null : prev);
    });

    sock.on("chat:message", (msg) => {
      setMessages((prev) => [...prev, { ...msg, reactions: msg.reactions || {} }]);
      if (!isChatOpenRef.current) setUnreadCount((prev) => prev + 1);
    });

    sock.on("chat:reaction", ({ messageId, emoji, senderId }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...(m.reactions || {}) };
          if (!reactions[emoji]) reactions[emoji] = [];
          if (!reactions[emoji].includes(senderId)) reactions[emoji] = [...reactions[emoji], senderId];
          return { ...m, reactions };
        })
      );
    });

    sock.on("meeting:ended", ({ message }) => { toast(message); doCleanup(); navigate("/dashboard"); });
    sock.on("meeting:lock-status", ({ locked }) => setIsLocked(locked));

    // Join — wait for connection if not ready yet
    const joinRoom = () => sock.emit("room:join", { meetingId });
    if (sock.connected) joinRoom();
    else sock.once("connect", joinRoom);

    return () => doCleanup();
  }, [stream]);

  const doCleanup = useCallback(() => {
    const sock = socketRef.current;
    if (sock) {
      [
        "room:joined","participant:joined","participant:left","waiting:new",
        "signal:offer","signal:answer","signal:ice-candidate",
        "participant:media-update","participant:hand-raise","participant:speaking",
        "host:force-mute","host:kicked","screen:started","screen:stopped",
        "chat:message","chat:reaction","meeting:ended","meeting:lock-status",
      ].forEach((e) => sock.off(e));
    }
    peerManagerRef.current?.destroy();
    cleanupScreen();
  }, [cleanupScreen]);

  // Controls — mic and video emit SEPARATE socket events
  const handleToggleMic = () => {
    const next = toggleMic();
    socketRef.current?.emit("media:mute-toggle", { meetingId, isMuted: !next });
  };

  const handleToggleVideo = async () => {
    const { isVideoOn: next, newTrack } = await toggleVideo();
    socketRef.current?.emit("media:video-toggle", { meetingId, isVideoOff: !next });
    if (newTrack) peerManagerRef.current?.replaceTrack(newTrack);
  };

  const handleToggleHand = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    socketRef.current?.emit("media:hand-raise", { meetingId, isHandRaised: next });
  };

  const handleSendMessage = (msg)        => socketRef.current?.emit("chat:message", { meetingId, message: msg });
  const handleSendFile    = (file)       => socketRef.current?.emit("chat:file",    { meetingId, file });
  const handleReact       = (id, emoji)  => socketRef.current?.emit("chat:reaction",{ meetingId, emoji, messageId: id });

  const handleLeave = () => {
    socketRef.current?.emit("room:leave", { meetingId });
    doCleanup();
    navigate("/dashboard");
  };

  const handleEndMeeting = () => {
    socketRef.current?.emit("host:end-meeting", { meetingId });
    doCleanup();
    navigate("/dashboard");
  };

  const handleApprove = (socketId) => {
    socketRef.current?.emit("waiting:approve", { meetingId, socketId });
    setWaitingRoom((prev) => prev.filter((p) => p.socketId !== socketId));
  };

  const handleDeny = (socketId) => {
    socketRef.current?.emit("waiting:deny", { meetingId, socketId });
    setWaitingRoom((prev) => prev.filter((p) => p.socketId !== socketId));
  };

  const handleMuteParticipant   = (sid) => socketRef.current?.emit("host:mute-participant",   { meetingId, socketId: sid });
  const handleRemoveParticipant = (sid) => socketRef.current?.emit("host:remove-participant", { meetingId, socketId: sid });

  const handleToggleChat = () => {
    setIsChatOpen((v) => { if (!v) { setUnreadCount(0); setIsParticipantsOpen(false); } return !v; });
  };

  const handleToggleParticipants = () => {
    setIsParticipantsOpen((v) => { if (!v) setIsChatOpen(false); return !v; });
  };

  const handleToggleLock = () => {
    const next = !isLocked;
    setIsLocked(next);
    socketRef.current?.emit("host:lock-meeting", { meetingId, locked: next });
  };

  const localUserObj = { name: user?.name, avatar: user?.avatar, isHost };
  const sidebarOpen  = isChatOpen || isParticipantsOpen;

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      {/* Top bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-surface-800 bg-surface-900 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-white" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white hidden sm:inline">Nexus</span>
        </div>

        <div className="flex items-center gap-3">
          {isHost && waitingRoom.length > 0 && (
            <button
              onClick={handleToggleParticipants}
              className="flex items-center gap-1.5 text-xs bg-amber-500/20 border border-amber-500/40 text-amber-400 px-2.5 py-1 rounded-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {waitingRoom.length} waiting
            </button>
          )}
          <span className="text-xs font-mono text-slate-500 hidden sm:inline tracking-widest">{meetingId}</span>
          {isHost && (
            <button
              onClick={handleToggleLock}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors
                ${isLocked ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-surface-800 border-surface-700 text-slate-400 hover:text-slate-200"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              {isLocked ? "Locked" : "Lock"}
            </button>
          )}
          {isScreenSharing && (
            <span className="flex items-center gap-1.5 text-xs bg-brand-600/20 border border-brand-500/40 text-brand-400 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Sharing screen
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-3 min-w-0 overflow-hidden">
          <VideoGrid
            localStream={stream}
            cameraStream={stream}
            localUser={localUserObj}
            localMicOn={isMicOn}
            localVideoOn={isVideoOn}
            remoteStreams={remoteStreams}
            participants={participants}
            activeSpeakerId={activeSpeakerId}
            screenShareSocketId={remoteScreenShareId}
            isLocalScreenSharing={isScreenSharing}
            screenShareStream={screenShareStream}
          />
        </div>

        {sidebarOpen && (
          <div className="w-72 border-l border-surface-800 bg-surface-900 flex-shrink-0 flex flex-col">
            {isChatOpen && (
              <ChatPanel
                messages={messages}
                onSend={handleSendMessage}
                onSendFile={handleSendFile}
                onReact={handleReact}
                currentUserId={user?._id}
              />
            )}
            {isParticipantsOpen && (
              <ParticipantsPanel
                participants={participants}
                waitingRoom={waitingRoom}
                localUser={localUserObj}
                isHost={isHost}
                onApprove={handleApprove}
                onDeny={handleDeny}
                onMuteParticipant={handleMuteParticipant}
                onRemoveParticipant={handleRemoveParticipant}
              />
            )}
          </div>
        )}
      </div>

      <MeetingControls
        isMicOn={isMicOn}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        isHost={isHost}
        unreadCount={unreadCount}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleHand={handleToggleHand}
        onToggleChat={handleToggleChat}
        onToggleParticipants={handleToggleParticipants}
        onLeave={handleLeave}
        onEnd={handleEndMeeting}
      />
    </div>
  );
};

export default MeetingRoom;
