import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import useMeetingStore from "../../store/meetingStore";

const CreateMeetingModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { createMeeting, loading } = useMeetingStore();

  const [form, setForm] = useState({
    title: "",
    password: "",
    waitingRoom: true,
    scheduledAt: "",
  });
  const [errors,  setErrors]  = useState({});
  const [created, setCreated] = useState(null); // { meetingId, password, isScheduled }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setErrors({ title: "Title is required." }); return; }

    const result = await createMeeting({
      title:       form.title.trim(),
      password:    form.password || undefined,
      waitingRoom: form.waitingRoom,
      scheduledAt: form.scheduledAt || undefined,
    });

    if (result.success) {
      const isScheduled = !!form.scheduledAt;
      if (isScheduled) {
        // Show code + password info before closing
        setCreated({
          meetingId:  result.meeting.meetingId,
          password:   form.password || null,
          isScheduled: true,
        });
      } else {
        // Instant meeting — show info then navigate
        setCreated({
          meetingId:  result.meeting.meetingId,
          password:   form.password || null,
          isScheduled: false,
        });
      }
    } else {
      toast.error(result.message);
    }
  };

  const handleStartNow = () => {
    navigate(`/meeting/${created.meetingId}`);
    handleClose();
  };

  const handleClose = () => {
    setForm({ title: "", password: "", waitingRoom: true, scheduledAt: "" });
    setErrors({});
    setCreated(null);
    onClose();
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard.`);
  };

  // ── Post-creation info screen ──────────────────────────────────
  if (created) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={created.isScheduled ? "Meeting Scheduled" : "Meeting Created"}>
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            {created.isScheduled
              ? "Your meeting has been scheduled. Share the details below with participants."
              : "Your meeting is ready. Share the details below before starting."}
          </p>

          {/* Meeting ID */}
          <div>
            <label className="field-label">Meeting ID</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 bg-elevated border border-theme rounded-xl font-mono text-lg tracking-widest text-primary font-bold text-center">
                {created.meetingId}
              </div>
              <button
                onClick={() => copyToClipboard(created.meetingId, "Meeting ID")}
                className="p-3 bg-elevated border border-theme rounded-xl text-secondary hover:text-primary hover:bg-brand-600/10 hover:border-brand-500/40 transition-colors"
                title="Copy meeting ID"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Password (if set) */}
          {created.password && (
            <div>
              <label className="field-label">Password</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-elevated border border-theme rounded-xl font-mono text-primary font-bold text-center tracking-widest">
                  {created.password}
                </div>
                <button
                  onClick={() => copyToClipboard(created.password, "Password")}
                  className="p-3 bg-elevated border border-theme rounded-xl text-secondary hover:text-primary hover:bg-brand-600/10 hover:border-brand-500/40 transition-colors"
                  title="Copy password"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {!created.password && (
            <p className="text-xs text-muted flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 flex-shrink-0" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              No password set — anyone with the ID can join.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={handleClose}>
              {created.isScheduled ? "Done" : "Close"}
            </Button>
            {!created.isScheduled && (
              <Button className="flex-1" onClick={handleStartNow}>
                Start meeting
              </Button>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  // ── Creation form ──────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Meeting">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Meeting title"
          id="title"
          name="title"
          placeholder="Team standup, Design review..."
          value={form.title}
          onChange={handleChange}
          error={errors.title}
        />

        <Input
          label="Password (optional)"
          id="password"
          name="password"
          type="text"
          placeholder="Leave blank for no password"
          value={form.password}
          onChange={handleChange}
        />

        <div>
          <label className="field-label">Schedule for later (optional)</label>
          <input
            type="datetime-local"
            name="scheduledAt"
            value={form.scheduledAt}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer py-1">
          <div className="relative w-10 h-5 flex-shrink-0">
            <input type="checkbox" name="waitingRoom" checked={form.waitingRoom} onChange={handleChange} className="sr-only" />
            <div
              onClick={() => setForm((p) => ({ ...p, waitingRoom: !p.waitingRoom }))}
              className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${form.waitingRoom ? "bg-brand-600" : "bg-elevated border border-theme"}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-transform ${form.waitingRoom ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Enable waiting room</p>
            <p className="text-xs text-muted">Participants wait for host approval.</p>
          </div>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1">
            {form.scheduledAt ? "Schedule" : "Create meeting"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateMeetingModal;
