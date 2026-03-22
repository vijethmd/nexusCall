import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";

/**
 * useScreenShare
 * - Screen share does NOT include audio (avoids echo/feedback)
 * - Only one presenter at a time enforced by server
 */
const useScreenShare = ({ socket, meetingId, peerManagerRef }) => {
  const [isSharing,   setIsSharing]   = useState(false);
  const [shareStream, setShareStream] = useState(null);
  const screenTrackRef = useRef(null);

  const startSharing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always", displaySurface: "monitor" },
        audio: false, // NO audio on screen share — prevents echo
      });

      const track = stream.getVideoTracks()[0];
      screenTrackRef.current = track;

      peerManagerRef.current?.addScreenShareTrack(track, stream);

      setShareStream(stream);
      setIsSharing(true);
      socket?.emit("screen:start", { meetingId });

      // Browser native "Stop sharing" button
      track.onended = () => stopSharing();

      return true;
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        toast.error("Could not start screen sharing.");
      }
      return false;
    }
  }, [socket, meetingId, peerManagerRef]);

  const stopSharing = useCallback(() => {
    if (screenTrackRef.current) {
      peerManagerRef.current?.removeScreenShareTrack(screenTrackRef.current);
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    setIsSharing(false);
    setShareStream(null);
    socket?.emit("screen:stop", { meetingId });
  }, [socket, meetingId, peerManagerRef]);

  const toggleScreenShare = useCallback(async () => {
    if (isSharing) stopSharing();
    else await startSharing();
  }, [isSharing, startSharing, stopSharing]);

  const cleanup = useCallback(() => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    setIsSharing(false);
    setShareStream(null);
  }, []);

  return { isSharing, shareStream, toggleScreenShare, cleanup };
};

export default useScreenShare;
