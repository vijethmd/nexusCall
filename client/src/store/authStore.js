import { create } from "zustand";
import api from "../lib/api";

const useAuthStore = create((set) => ({
  user:    JSON.parse(localStorage.getItem("user")) || null,
  token:   localStorage.getItem("token") || null,
  loading: false,
  error:   null,

  // Signup returns userId + email for OTP step — no token yet
  signup: async ({ name, email, password }) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/auth/signup", { name, email, password });
      set({ loading: false });
      return { success: true, userId: res.data.userId, email: res.data.email };
    } catch (err) {
      const message = err.response?.data?.message || "Signup failed.";
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  // Login — no OTP check
  login: async ({ email, password }) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      set({ user, token, loading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed.";
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  logout: async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null, error: null });
  },

  fetchMe: async () => {
    try {
      const res = await api.get("/auth/me");
      const user = res.data.user;
      localStorage.setItem("user", JSON.stringify(user));
      set({ user });
    } catch (_) {}
  },

  // Called after OTP verification succeeds
  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
