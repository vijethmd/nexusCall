import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSocket } from "../lib/socket";

const WaitingRoom = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Host approved us
    socket.on("room:joined", () => {
      navigate(`/meeting/${meetingId}/room`, { replace: true });
    });

    // Host denied us
    socket.on("waiting:denied", ({ message }) => {
      navigate(`/dashboard?denied=1&message=${encodeURIComponent(message)}`);
    });

    // Meeting ended before we got in
    socket.on("meeting:ended", () => {
      navigate(`/dashboard?ended=1`);
    });

    return () => {
      socket.off("room:joined");
      socket.off("waiting:denied");
      socket.off("meeting:ended");
    };
  }, [meetingId, navigate]);

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6">
      <div className="glass p-10 max-w-sm w-full text-center animate-slide-up">
        {/* Animated pulse ring */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <span className="absolute inset-0 rounded-full bg-brand-600/30 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-brand-600/20 border border-brand-500/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-brand-400" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">Waiting to be admitted</h2>
        <p className="text-secondary text-sm mb-6">
          The host has been notified. Please wait while they admit you to the meeting.
        </p>

        <div className="flex items-center justify-center gap-1.5 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        <p className="text-xs text-slate-600">Meeting ID: {meetingId}</p>
      </div>
    </div>
  );
};

export default WaitingRoom;
