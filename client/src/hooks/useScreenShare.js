import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";

/**
 * useScreenShare
 *
 * Manages getDisplayMedia, track replacement on peers,
 * and cleanup when the browser's native "Stop sharing" button is clicked.
 */
const useScreenShare = ({ socket, meetingId, peerManagerRef }) => {
  const [isSharing,    setIsSharing]    = useState(false);
  const [shareStream,  setShareStream]  = useState(null);
  const screenTrackRef = useRef(null);

  const startSharing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "monitor",
        },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      screenTrackRef.current = track;

      // Push screen track to all active peer connections
      peerManagerRef.current?.addScreenShareTrack(track, stream);

      setShareStream(stream);
      setIsSharing(true);
      socket?.emit("screen:start", { meetingId });

      // Handle user clicking browser's native "Stop sharing" button
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
      // Remove track from all peers before stopping
      peerManagerRef.current?.removeScreenShareTrack(screenTrackRef.current);
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    setIsSharing(false);
    setShareStream(null);
    socket?.emit("screen:stop", { meetingId });
  }, [socket, meetingId, peerManagerRef]);

  const toggleScreenShare = useCallback(async () => {
    if (isSharing) {
      stopSharing();
    } else {
      await startSharing();
    }
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
