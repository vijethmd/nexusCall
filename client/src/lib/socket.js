import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => socket;

export const initSocket = (token) => {
  // If already connected reuse it
  if (socket?.connected) return socket;

  // Disconnect any stale socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  socket.on("connect", () => console.log("[Socket] Connected:", socket.id));
  socket.on("connect_error", (err) => console.error("[Socket] Error:", err.message));
  socket.on("disconnect", (reason) => console.log("[Socket] Disconnected:", reason));

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { getSocket, initSocket, disconnectSocket };
