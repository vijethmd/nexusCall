import { create } from "zustand";
import api from "../lib/api";

const useMeetingStore = create((set, get) => ({
  meetings: [],
  currentMeeting: null,
  loading: false,
  error: null,

  // ── Fetch user's meetings ────────────────────────────
  fetchMeetings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get("/meetings");
      set({ meetings: res.data.meetings, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || "Failed to load meetings.", loading: false });
    }
  },

  // ── Create meeting ───────────────────────────────────
  createMeeting: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/meetings", payload);
      const meeting = res.data.meeting;
      set((state) => ({
        meetings: [meeting, ...state.meetings],
        currentMeeting: meeting,
        loading: false,
      }));
      return { success: true, meeting };
    } catch (err) {
      const message = err.response?.data?.message || "Failed to create meeting.";
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  // ── Validate join ────────────────────────────────────
  validateJoin: async (meetingId, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/meetings/join", { meetingId, password });
      set({ currentMeeting: res.data.meeting, loading: false });
      return { success: true, ...res.data };
    } catch (err) {
      const data = err.response?.data || {};
      set({ error: data.message, loading: false });
      return { success: false, message: data.message, requiresPassword: data.requiresPassword };
    }
  },

  setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),
  clearCurrentMeeting: () => set({ currentMeeting: null }),
  clearError: () => set({ error: null }),
}));

export default useMeetingStore;
