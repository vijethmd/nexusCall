import { useState, useEffect, useRef, useCallback } from "react";

const useMediaStream = (initialMic = true, initialVideo = true) => {
  const streamRef     = useRef(null);
  const videoTrackRef = useRef(null);
  const audioTrackRef = useRef(null);

  const [stream,    setStream]    = useState(null);
  const [isMicOn,   setIsMicOn]   = useState(initialMic);
  const [isVideoOn, setIsVideoOn] = useState(initialVideo);
  const [isReady,   setIsReady]   = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    let active = true;

    const acquire = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });

        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }

        const vTrack = s.getVideoTracks()[0];
        const aTrack = s.getAudioTracks()[0];

        if (vTrack) { vTrack.enabled = initialVideo; videoTrackRef.current = vTrack; }
        if (aTrack) { aTrack.enabled = initialMic;   audioTrackRef.current = aTrack; }

        streamRef.current = s;
        setStream(s);
        setIsReady(true);
      } catch (err) {
        if (!active) return;
        console.error("[useMediaStream]", err);
        setError(err.message);

        // Try audio-only fallback
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          });
          if (!active) { audioOnly.getTracks().forEach((t) => t.stop()); return; }
          const aTrack = audioOnly.getAudioTracks()[0];
          if (aTrack) { aTrack.enabled = initialMic; audioTrackRef.current = aTrack; }
          streamRef.current = audioOnly;
          setStream(audioOnly);
          setIsVideoOn(false);
        } catch (_) {}

        setIsReady(true);
      }
    };

    acquire();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current  = null;
      videoTrackRef.current = null;
      audioTrackRef.current = null;
    };
  }, []);

  // Toggle mic ONLY — never touches video
  const toggleMic = useCallback(() => {
    const track = audioTrackRef.current || streamRef.current?.getAudioTracks()[0];
    const next = !isMicOn;
    if (track) track.enabled = next;
    setIsMicOn(next);
    return next;
  }, [isMicOn]);

  // Toggle video ONLY — never touches audio
  const toggleVideo = useCallback(async () => {
    const next = !isVideoOn;

    if (!next) {
      // Turn OFF — disable video track only
      const track = videoTrackRef.current || streamRef.current?.getVideoTracks()[0];
      if (track) {
        track.enabled = false;
        videoTrackRef.current = track;
      }
      setIsVideoOn(false);
      return { isVideoOn: false, newTrack: null };
    }

    // Turn ON — try re-enabling existing track first
    const existing = videoTrackRef.current || streamRef.current?.getVideoTracks()[0];
    if (existing && existing.readyState !== "ended") {
      existing.enabled = true;
      videoTrackRef.current = existing;
      setIsVideoOn(true);
      return { isVideoOn: true, newTrack: existing };
    }

    // Track ended — acquire a new one
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];
      streamRef.current?.addTrack(newTrack);
      videoTrackRef.current = newTrack;
      setStream(streamRef.current);
      setIsVideoOn(true);
      return { isVideoOn: true, newTrack };
    } catch (err) {
      console.error("[toggleVideo] failed:", err);
      setIsVideoOn(false);
      return { isVideoOn: false, newTrack: null };
    }
  }, [isVideoOn]);

  // Force mute audio only — used by host controls
  const forceMute = useCallback(() => {
    const track = audioTrackRef.current || streamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = false;
    setIsMicOn(false);
  }, []);

  return { stream, streamRef, isMicOn, isVideoOn, error, isReady, toggleMic, toggleVideo, forceMute };
};

export default useMediaStream;
