import { useEffect, useRef, useCallback } from "react";

/**
 * useActiveSpeaker
 *
 * Uses the Web Audio API (AnalyserNode) to detect whether the local user
 * is currently speaking. Emits socket events so the room can highlight
 * the active speaker tile.
 *
 * Detection runs every 100ms and emits only on state change to avoid flooding.
 */
const SPEAKING_THRESHOLD = 15;   // RMS value 0-255 above which = speaking
const SILENCE_HOLD_MS    = 1500; // How long to wait before marking as silent

const useActiveSpeaker = ({ stream, socket, meetingId, isMicOn }) => {
  const audioContextRef = useRef(null);
  const analyserRef     = useRef(null);
  const sourceRef       = useRef(null);
  const intervalRef     = useRef(null);
  const isSpeakingRef   = useRef(false);
  const silenceTimerRef = useRef(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current)     clearInterval(intervalRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    sourceRef.current?.disconnect();
    analyserRef.current = null;
    sourceRef.current   = null;
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
  }, []);

  useEffect(() => {
    if (!stream || !isMicOn) {
      cleanup();
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) { cleanup(); return; }

    try {
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      const source   = ctx.createMediaStreamSource(stream);

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current     = analyser;
      sourceRef.current       = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      intervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Compute RMS volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sum += norm * norm;
        }
        const rms = Math.sqrt(sum / dataArray.length) * 255;
        const nowSpeaking = rms > SPEAKING_THRESHOLD;

        if (nowSpeaking && !isSpeakingRef.current) {
          // Became speaking
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          isSpeakingRef.current = true;
          socket?.emit("media:speaking", { meetingId, isSpeaking: true });
        } else if (!nowSpeaking && isSpeakingRef.current) {
          // Potentially stopped speaking — wait before confirming silence
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              isSpeakingRef.current   = false;
              silenceTimerRef.current = null;
              socket?.emit("media:speaking", { meetingId, isSpeaking: false });
            }, SILENCE_HOLD_MS);
          }
        }
      }, 100);
    } catch (err) {
      // Web Audio API not available or blocked — fail silently
      console.warn("[useActiveSpeaker] Audio context unavailable:", err.message);
    }

    return cleanup;
  }, [stream, isMicOn, socket, meetingId, cleanup]);
};

export default useActiveSpeaker;
