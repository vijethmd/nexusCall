import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import useMeetingStore from "../store/meetingStore";
import { initSocket, getSocket } from "../lib/socket";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";

const PreJoinPage = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { validateJoin, currentMeeting } = useMeetingStore();

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isMicOn,  setIsMicOn]  = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [joining, setJoining] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState(null);

  // Start camera preview
  useEffect(() => {
    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast.error("Could not access camera or microphone.");
        setIsVideoOn(false);
        setIsMicOn(false);
      }
    };
    startPreview();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Validate meeting exists
  useEffect(() => {
    const check = async () => {
      const result = await validateJoin(meetingId);
      if (!result.success && !result.requiresPassword) {
        toast.error(result.message);
        navigate("/dashboard");
      } else {
        setMeetingInfo(result.meeting);
      }
    };
    check();
  }, [meetingId]);

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !isMicOn;
    setIsMicOn((v) => !v);
  };

  const toggleVideo = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = !isVideoOn;
    setIsVideoOn((v) => !v);
  };

  const handleJoin = async () => {
    setJoining(true);

    // Stop preview stream — the meeting room will create its own
    streamRef.current?.getTracks().forEach((t) => t.stop());

    // Init socket if not already connected
    const socket = initSocket(token);

    // Navigate to meeting room; pass initial media state via location state
    navigate(`/meeting/${meetingId}/room`, {
      state: { initialMic: isMicOn, initialVideo: isVideoOn },
    });
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-3xl animate-slide-up">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            {meetingInfo?.title || "Joining meeting..."}
          </h1>
          <p className="text-secondary mt-1.5 font-mono text-sm tracking-widest">{meetingId}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Video preview */}
          <div className="lg:col-span-3">
            <div className="relative aspect-video bg-surface rounded-2xl overflow-hidden border border-theme">
              {isVideoOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Avatar user={user} size="2xl" />
                  <p className="text-muted text-sm mt-3">Camera is off</p>
                </div>
              )}

              {/* Controls overlay */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <button
                  onClick={toggleMic}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all
                    ${isMicOn
                      ? "bg-elevated/80 text-white hover:bg-surface-700"
                      : "bg-red-600 text-white hover:bg-red-500"}`}
                >
                  {isMicOn ? (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" stroke="currentColor" strokeWidth="2">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                      <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all
                    ${isVideoOn
                      ? "bg-elevated/80 text-white hover:bg-surface-700"
                      : "bg-red-600 text-white hover:bg-red-500"}`}
                >
                  {isVideoOn ? (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" stroke="currentColor" strokeWidth="2">
                      <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" stroke="currentColor" strokeWidth="2">
                      <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 flex flex-col justify-between gap-5">
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar user={user} size="md" />
                <div>
                  <p className="font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-muted">{user?.email}</p>
                </div>
              </div>

              <div className="border-t border-theme pt-4 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">Microphone</span>
                  <span className={isMicOn ? "text-emerald-400" : "text-red-400"}>
                    {isMicOn ? "On" : "Off"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">Camera</span>
                  <span className={isVideoOn ? "text-emerald-400" : "text-red-400"}>
                    {isVideoOn ? "On" : "Off"}
                  </span>
                </div>
                {meetingInfo?.hasPassword && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">Password</span>
                    <span className="text-emerald-400">Verified</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleJoin}
              loading={joining}
              size="lg"
              className="w-full"
            >
              Join Meeting
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreJoinPage;
