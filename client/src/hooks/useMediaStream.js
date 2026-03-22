import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useMediaStream
 *
 * Acquires a local media stream with noise suppression and echo cancellation.
 * Exposes controls to toggle mic/camera and replace tracks on the stream.
 */
const useMediaStream = (initialMic = true, initialVideo = true) => {
  const streamRef = useRef(null);
  const [stream,     setStream]     = useState(null);
  const [isMicOn,    setIsMicOn]    = useState(initialMic);
  const [isVideoOn,  setIsVideoOn]  = useState(initialVideo);
  const [error,      setError]      = useState(null);
  const [isReady,    setIsReady]    = useState(false);

  // Acquire media on mount
  useEffect(() => {
    let active = true;

    const acquire = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: initialVideo
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
            : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }

        // Apply initial toggle states
        s.getAudioTracks().forEach((t) => { t.enabled = initialMic; });
        s.getVideoTracks().forEach((t) => { t.enabled = initialVideo; });

        streamRef.current = s;
        setStream(s);
        setIsReady(true);
      } catch (err) {
        if (!active) return;
        console.error("[useMediaStream]", err);
        setError(err.message);
        setIsReady(true); // Still mark ready so UI can render
      }
    };

    acquire();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleMic = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks() ?? [];
    const next = !isMicOn;
    tracks.forEach((t) => { t.enabled = next; });
    setIsMicOn(next);
    return next;
  }, [isMicOn]);

  const toggleVideo = useCallback(async () => {
    const next = !isVideoOn;

    if (!next) {
      // Turn camera off — just disable the track
      streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = false; });
      setIsVideoOn(false);
      return { isVideoOn: false, newTrack: null };
    }

    // Turn camera on — re-enable existing track if present
    const existing = streamRef.current?.getVideoTracks()[0];
    if (existing) {
      existing.enabled = true;
      setIsVideoOn(true);
      return { isVideoOn: true, newTrack: existing };
    }

    // Otherwise acquire a new video track and add to existing stream
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const newTrack = newStream.getVideoTracks()[0];
      streamRef.current?.addTrack(newTrack);
      setStream(streamRef.current); // Trigger re-render
      setIsVideoOn(true);
      return { isVideoOn: true, newTrack };
    } catch (err) {
      console.error("[toggleVideo] could not acquire camera:", err);
      return { isVideoOn: false, newTrack: null };
    }
  }, [isVideoOn]);

  const forceMute = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
    setIsMicOn(false);
  }, []);

  return {
    stream,
    streamRef,
    isMicOn,
    isVideoOn,
    error,
    isReady,
    toggleMic,
    toggleVideo,
    forceMute,
  };
};

export default useMediaStream;
