import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import useMeetingStore from "../../store/meetingStore";

const JoinMeetingModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { validateJoin, loading } = useMeetingStore();

  const [meetingId, setMeetingId] = useState("");
  const [password, setPassword] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!meetingId.trim()) { setError("Please enter a meeting ID."); return; }

    const result = await validateJoin(meetingId.trim().toUpperCase(), password || undefined);

    if (result.success) {
      toast.success("Joining meeting...");
      onClose();
      navigate(`/meeting/${result.meeting.meetingId}`);
    } else {
      if (result.requiresPassword) {
        setRequiresPassword(true);
        if (password) toast.error(result.message);
      } else {
        toast.error(result.message);
        setError(result.message);
      }
    }
  };

  const handleClose = () => {
    setMeetingId("");
    setPassword("");
    setRequiresPassword(false);
    setError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Join a Meeting">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Meeting ID"
          id="meetingId"
          value={meetingId}
          onChange={(e) => { setMeetingId(e.target.value.toUpperCase()); setError(""); }}
          placeholder="Enter 12-character meeting ID"
          error={error}
          maxLength={12}
          className="font-mono tracking-widest"
        />

        {requiresPassword && (
          <Input
            label="Meeting password"
            id="join-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter meeting password"
            autoFocus
          />
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Join
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default JoinMeetingModal;
