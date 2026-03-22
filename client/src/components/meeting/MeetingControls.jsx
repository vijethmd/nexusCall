const ControlButton = ({ onClick, active, danger, disabled, title, label, children, badge }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      relative flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-xl
      transition-all duration-150 select-none min-w-[48px]
      ${danger
        ? "bg-red-600 hover:bg-red-500 text-white"
        : active
          ? "bg-brand-600/20 text-brand-400 border border-brand-500/30"
          : "text-secondary hover:text-primary hover:bg-elevated"}
      disabled:opacity-40 disabled:cursor-not-allowed
    `}
  >
    {children}
    {label && <span className="text-[10px] font-medium hidden sm:block leading-none">{label}</span>}
    {badge > 0 && (
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </button>
);

const MicIcon     = ({ on }) => on ? (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-red-400" stroke="currentColor" strokeWidth="2">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8" />
  </svg>
);

const CamIcon = ({ on }) => on ? (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
    <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-red-400" stroke="currentColor" strokeWidth="2">
    <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const MeetingControls = ({
  isMicOn, isVideoOn, isScreenSharing, isHandRaised,
  isChatOpen, isParticipantsOpen, isHost,
  onToggleMic, onToggleVideo, onToggleScreenShare, onToggleHand,
  onToggleChat, onToggleParticipants, onLeave, onEnd,
  unreadCount = 0,
}) => (
  <div className="flex items-center justify-between px-3 sm:px-5 py-2 bg-surface border-t border-theme flex-shrink-0">

    {/* Left spacer (desktop) */}
    <div className="hidden sm:block w-24" />

    {/* Centre controls */}
    <div className="flex items-center gap-1 sm:gap-1.5 mx-auto">
      <ControlButton onClick={onToggleMic} active={isMicOn} title={isMicOn ? "Mute" : "Unmute"} label={isMicOn ? "Mute" : "Unmute"}>
        <MicIcon on={isMicOn} />
      </ControlButton>

      <ControlButton onClick={onToggleVideo} active={isVideoOn} title={isVideoOn ? "Stop video" : "Start video"} label={isVideoOn ? "Stop video" : "Start video"}>
        <CamIcon on={isVideoOn} />
      </ControlButton>

      <ControlButton onClick={onToggleScreenShare} active={isScreenSharing} title="Share screen" label={isScreenSharing ? "Stop share" : "Share"}>
        <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 ${isScreenSharing ? "text-brand-400" : ""}`} stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      </ControlButton>

      <ControlButton onClick={onToggleHand} active={isHandRaised} title={isHandRaised ? "Lower hand" : "Raise hand"} label="Hand">
        <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 ${isHandRaised ? "text-amber-400" : ""}`} stroke="currentColor" strokeWidth="2">
          <path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v2M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v8" />
          <path d="M18 11a2 2 0 114 0v3a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15" />
        </svg>
      </ControlButton>

      <ControlButton onClick={onToggleChat} active={isChatOpen} badge={unreadCount} title="Chat" label="Chat">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </ControlButton>

      <ControlButton onClick={onToggleParticipants} active={isParticipantsOpen} title="Participants" label="People">
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      </ControlButton>
    </div>

    {/* Right — leave / end */}
    <div className="flex items-center">
      {isHost ? (
        <ControlButton onClick={onEnd} danger title="End meeting for all" label="End">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
            <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.42 19.42 0 01-3.33-2.67m-2.67-3.34a19.79 19.79 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
            <line x1="23" y1="1" x2="1" y2="23" />
          </svg>
        </ControlButton>
      ) : (
        <ControlButton onClick={onLeave} danger title="Leave meeting" label="Leave">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </ControlButton>
      )}
    </div>
  </div>
);

export default MeetingControls;
