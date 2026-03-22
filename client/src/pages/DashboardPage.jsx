import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import useMeetingStore from "../store/meetingStore";
import { initSocket } from "../lib/socket";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import ThemeToggle from "../components/ui/ThemeToggle";
import CreateMeetingModal from "../components/meeting/CreateMeetingModal";
import JoinMeetingModal from "../components/meeting/JoinMeetingModal";

const ActionCard = ({ icon, title, desc, onClick, accent = false }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-5 rounded-2xl border transition-all duration-150 group
      ${accent
        ? "bg-brand-600 border-brand-500 hover:bg-brand-500 text-white"
        : "card hover:border-brand-700/50 hover:bg-elevated"}`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors
      ${accent
        ? "bg-white/20"
        : "bg-elevated border border-theme group-hover:bg-brand-600/10 group-hover:border-brand-500/30"}`}
    >
      <span className={accent ? "text-white" : "text-secondary group-hover:text-brand-400"}>
        {icon}
      </span>
    </div>
    <p className={`font-semibold text-sm mb-0.5 ${accent ? "text-white" : "text-primary"}`}>{title}</p>
    <p className={`text-xs leading-relaxed ${accent ? "text-white/70" : "text-muted"}`}>{desc}</p>
  </button>
);

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
    <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, token } = useAuthStore();
  const { meetings, fetchMeetings } = useMeetingStore();

  const [showCreate,      setShowCreate]      = useState(false);
  const [showJoin,        setShowJoin]        = useState(false);
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);

  useEffect(() => {
    if (token) initSocket(token);
    fetchMeetings();
  }, [token]);

  useEffect(() => {
    if (searchParams.get("denied")) toast.error("You were not admitted to the meeting.");
    if (searchParams.get("ended"))  toast("The meeting has ended.");
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out.");
    navigate("/login");
  };

  const upcoming = meetings.filter((m) => m.status === "scheduled");
  const past     = meetings.filter((m) => m.status === "ended").slice(0, 5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-base">
      {/* Topbar */}
      <header className="topbar">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-white" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <span className="font-semibold text-primary tracking-tight">Nexus</span>
        </div>

        {/* Desktop right */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-secondary">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {user?.name}
          </div>
          <ThemeToggle />
          <Avatar user={user} size="sm" />
          <Button variant="ghost" size="sm" onClick={handleLogout}>Sign out</Button>
        </div>

        {/* Mobile right */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setMobileMenuOpen((v) => !v)}>
            <Avatar user={user} size="sm" />
          </button>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-theme bg-surface px-5 py-3 flex items-center justify-between animate-fade-in">
          <div className="text-sm text-secondary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {user?.name}
          </div>
          <button onClick={handleLogout} className="text-sm text-brand-500 font-medium">
            Sign out
          </button>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            {greeting()},{" "}
            <span className="text-gradient">{user?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-secondary mt-1 text-sm">What would you like to do today?</p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          <div className="col-span-2 sm:col-span-1">
            <ActionCard
              accent
              icon={<VideoIcon />}
              title="New Meeting"
              desc="Start an instant meeting now."
              onClick={() => setShowCreate(true)}
            />
          </div>
          <ActionCard
            icon={<PeopleIcon />}
            title="Join Meeting"
            desc="Enter a meeting ID to join."
            onClick={() => setShowJoin(true)}
          />
          <ActionCard
            icon={<CalendarIcon />}
            title="Schedule"
            desc="Plan a future meeting."
            onClick={() => setShowCreate(true)}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { label: "Total meetings",  value: meetings.length },
            { label: "Upcoming",        value: upcoming.length },
            { label: "Completed",       value: past.length },
          ].map(({ label, value }) => (
            <div key={label} className="card px-4 py-4 text-center">
              <p className="text-2xl font-bold text-primary">{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Upcoming meetings */}
        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">
              Upcoming
            </h2>
            <div className="space-y-2">
              {upcoming.map((m) => (
                <div key={m._id} className="card px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-primary text-sm truncate">{m.title}</p>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-muted">
                        {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : "Instant"}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-secondary">
                        <span className="text-muted">ID:</span>
                        <span className="font-mono font-semibold tracking-wider text-primary">{m.meetingId}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(m.meetingId); }}
                          className="text-muted hover:text-brand-400 transition-colors"
                          title="Copy meeting ID"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                          </svg>
                        </button>
                      </span>
                      {m.hasPassword && (
                        <span className="text-xs flex items-center gap-1 text-amber-500">
                          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                          </svg>
                          Password protected
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/meeting/${m.meetingId}`)}>
                    Start
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent meetings */}
        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">
              Recent
            </h2>
            <div className="space-y-1.5">
              {past.map((m) => (
                <div key={m._id} className="card px-4 sm:px-5 py-3 flex items-center justify-between gap-3 opacity-60">
                  <div className="min-w-0">
                    <p className="font-medium text-primary text-sm truncate">{m.title}</p>
                    <p className="text-xs text-muted mt-0.5">
                      Ended · {m.endedAt ? new Date(m.endedAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <span className="text-xs text-muted font-mono flex-shrink-0">{m.meetingId}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {meetings.length === 0 && (
          <div className="card py-14 flex flex-col items-center text-center mt-2">
            <div className="w-12 h-12 rounded-2xl bg-elevated border border-theme flex items-center justify-center mb-4">
              <CalendarIcon />
            </div>
            <p className="font-medium text-primary text-sm">No meetings yet</p>
            <p className="text-muted text-xs mt-1 mb-5">Create your first meeting to get started.</p>
            <Button onClick={() => setShowCreate(true)}>New Meeting</Button>
          </div>
        )}
      </main>

      <CreateMeetingModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <JoinMeetingModal   isOpen={showJoin}   onClose={() => setShowJoin(false)} />
    </div>
  );
};

export default DashboardPage;
