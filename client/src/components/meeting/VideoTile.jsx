import { useEffect, useRef } from "react";
import Avatar from "../ui/Avatar";

/**
 * VideoTile
 *
 * Renders a single participant's video feed (or avatar fallback).
 * Used both for the local user and remote participants.
 */
const VideoTile = ({
  stream,
  participant,       // { name, avatar, isMuted, isVideoOff, isHandRaised, isHost }
  isLocal = false,
  isActiveSpeaker = false,
  isScreenShare = false,
  className = "",
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showVideo = stream && !participant?.isVideoOff;

  return (
    <div
      className={`
        relative bg-surface-900 rounded-xl overflow-hidden flex items-center justify-center
        ${isActiveSpeaker ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-950" : ""}
        ${className}
      `}
    >
      {/* Video element */}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Never play local audio back — causes echo
          className={`w-full h-full object-cover ${isLocal && !isScreenShare ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <Avatar user={participant} size="xl" />
        </div>
      )}

      {/* Bottom-left name + mute badge */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-1.5">
          {participant?.isMuted && (
            <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-white" stroke="currentColor" strokeWidth="2.5">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                <path d="M17 16.95A7 7 0 015 12v-2" />
              </svg>
            </span>
          )}
          <span className="text-xs text-white font-medium truncate leading-none">
            {participant?.name || "Participant"}
            {isLocal && <span className="text-slate-400"> (You)</span>}
            {participant?.isHost && <span className="text-brand-400"> · Host</span>}
          </span>
        </div>
      </div>

      {/* Hand raised indicator */}
      {participant?.isHandRaised && (
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow">
          <span className="text-sm">&#9995;</span>
        </div>
      )}

      {/* Screen share label */}
      {isScreenShare && (
        <div className="absolute top-2 left-2">
          <span className="text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full font-medium">
            Screen share
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoTile;
