import Avatar from "../ui/Avatar";

const ParticipantsPanel = ({
  participants,
  waitingRoom,
  localUser,
  isHost,
  onApprove,
  onDeny,
  onMuteParticipant,
  onRemoveParticipant,
}) => {
  const total = participants.length + 1; // +1 for local user

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-800">
        <h3 className="font-semibold text-white text-sm">Participants ({total})</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Waiting room section (host only) */}
        {isHost && waitingRoom.length > 0 && (
          <div className="p-3">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
              Waiting ({waitingRoom.length})
            </p>
            {waitingRoom.map((p) => (
              <div key={p.socketId} className="flex items-center gap-3 py-2">
                <Avatar user={p} size="sm" />
                <span className="flex-1 text-sm text-slate-200 truncate">{p.name}</span>
                <button
                  onClick={() => onApprove(p.socketId)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-colors"
                >
                  Admit
                </button>
                <button
                  onClick={() => onDeny(p.socketId)}
                  className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  Deny
                </button>
              </div>
            ))}
            <div className="border-t border-surface-800 mt-2" />
          </div>
        )}

        {/* Active participants */}
        <div className="p-3 space-y-1">
          {/* Local user */}
          <ParticipantRow
            participant={{ ...localUser, isHost: localUser?.isHost }}
            isLocal
          />

          {/* Remote participants */}
          {participants.map((p) => (
            <ParticipantRow
              key={p.socketId}
              participant={p}
              isHost={isHost}
              onMute={() => onMuteParticipant(p.socketId)}
              onRemove={() => onRemoveParticipant(p.socketId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ParticipantRow = ({ participant, isLocal, isHost, onMute, onRemove }) => {
  const [showActions, setShowActions] = React.useState(false);

  return (
    <div
      className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-800/50 transition-colors group cursor-default"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar user={participant} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">
          {participant.name}
          {isLocal && <span className="text-slate-500"> (You)</span>}
          {participant.isHost && <span className="text-brand-400"> · Host</span>}
        </p>
      </div>

      {/* Status icons */}
      <div className="flex items-center gap-1.5">
        {participant.isHandRaised && (
          <span className="text-amber-400 text-xs">&#9995;</span>
        )}
        {participant.isMuted ? (
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-red-400" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-slate-500" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          </svg>
        )}
        {participant.isVideoOff && (
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-slate-500" stroke="currentColor" strokeWidth="2">
            <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      </div>

      {/* Host actions (shown on hover) */}
      {isHost && !isLocal && showActions && (
        <div className="flex items-center gap-1">
          <button
            onClick={onMute}
            title="Mute"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            title="Remove"
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-surface-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

// Need React in scope for useState in ParticipantRow
import React from "react";

export default ParticipantsPanel;
