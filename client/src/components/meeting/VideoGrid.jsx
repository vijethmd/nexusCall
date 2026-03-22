import VideoTile from "./VideoTile";

/**
 * VideoGrid
 *
 * Screen share active: large presenter view + thumbnail sidebar.
 * No screen share: responsive CSS grid adapting to participant count.
 *
 * cameraStream is always the raw webcam feed (used for local thumbnail
 * when screen sharing is active).
 */
const VideoGrid = ({
  localStream,
  cameraStream,
  localUser,
  localMicOn,
  localVideoOn,
  remoteStreams,
  participants,
  activeSpeakerId,
  screenShareSocketId,
  isLocalScreenSharing,
}) => {
  const totalCount = participants.length + 1;

  // ── Screen share layout ───────────────────────────────────────
  if (screenShareSocketId || isLocalScreenSharing) {
    const sharerStream     = isLocalScreenSharing ? localStream : remoteStreams.get(screenShareSocketId);
    const sharerParticipant = isLocalScreenSharing
      ? localUser
      : participants.find((p) => p.socketId === screenShareSocketId);

    return (
      <div className="flex h-full gap-3">
        {/* Large presenter view */}
        <div className="flex-1 min-w-0">
          <VideoTile
            stream={sharerStream}
            participant={{ ...sharerParticipant, isVideoOff: false }}
            isLocal={isLocalScreenSharing}
            isScreenShare
            className="w-full h-full"
          />
        </div>

        {/* Thumbnail strip */}
        <div className="w-44 flex flex-col gap-2 overflow-y-auto">
          {/* Local camera thumbnail (not the screen share) */}
          <VideoTile
            stream={cameraStream || localStream}
            participant={{ ...localUser, isMuted: !localMicOn, isVideoOff: !localVideoOn }}
            isLocal
            isActiveSpeaker={activeSpeakerId === "local"}
            className="w-full aspect-video"
          />
          {participants.map((p) => (
            <VideoTile
              key={p.socketId}
              stream={remoteStreams.get(p.socketId)}
              participant={p}
              isActiveSpeaker={activeSpeakerId === p.socketId}
              className="w-full aspect-video"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Standard grid layout ──────────────────────────────────────
  const gridClass = getGridClass(totalCount);

  return (
    <div className={`grid h-full gap-2 auto-rows-fr ${gridClass}`}>
      <VideoTile
        stream={localStream}
        participant={{ ...localUser, isMuted: !localMicOn, isVideoOff: !localVideoOn }}
        isLocal
        isActiveSpeaker={activeSpeakerId === "local"}
        className="w-full h-full min-h-0"
      />
      {participants.map((p) => (
        <VideoTile
          key={p.socketId}
          stream={remoteStreams.get(p.socketId)}
          participant={p}
          isActiveSpeaker={activeSpeakerId === p.socketId}
          className="w-full h-full min-h-0"
        />
      ))}
    </div>
  );
};

function getGridClass(count) {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count <= 4)  return "grid-cols-2";
  if (count <= 6)  return "grid-cols-3";
  if (count <= 9)  return "grid-cols-3";
  return "grid-cols-4";
}

export default VideoGrid;
