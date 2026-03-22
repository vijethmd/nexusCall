const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Meeting = require("../models/Meeting");
const roomManager = require("./roomManager");

/**
 * Authenticate a socket connection via JWT passed in handshake auth.
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required."));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new Error("User not found."));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Invalid token."));
  }
};

const registerSocketHandlers = (io) => {
  // Apply auth middleware to all socket connections
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.user.name} (${socket.id})`);

    // ─────────────────────────────────────────────────────────────
    // JOIN ROOM
    // ─────────────────────────────────────────────────────────────
    socket.on("room:join", async ({ meetingId }) => {
      try {
        const meeting = await Meeting.findOne({ meetingId }).populate("host", "_id");
        if (!meeting) return socket.emit("error", { message: "Meeting not found." });
        if (meeting.status === "ended") return socket.emit("error", { message: "Meeting has ended." });
        if (meeting.isLocked) return socket.emit("error", { message: "Meeting is locked." });

        const isHost = meeting.host._id.toString() === socket.user._id.toString();
        const userData = {
          userId: socket.user._id.toString(),
          name: socket.user.name,
          avatar: socket.user.avatar || "",
        };

        // Ensure room exists in memory
        roomManager.getOrCreate(meetingId, meeting.host._id.toString());

        if (isHost) {
          // Host joins directly
          socket.join(meetingId);
          roomManager.addParticipant(meetingId, socket.id, userData);

          const participants = roomManager.getParticipants(meetingId);
          const waiting = roomManager.getWaitingRoom(meetingId);

          socket.emit("room:joined", {
            meetingId,
            isHost: true,
            participants,
            waitingRoom: waiting,
          });

          // Notify existing participants of new joiner
          socket.to(meetingId).emit("participant:joined", {
            socketId: socket.id,
            ...userData,
            isHost: true,
          });
        } else if (meeting.waitingRoom) {
          // Non-host goes to waiting room
          roomManager.addToWaiting(meetingId, socket.id, userData);

          socket.emit("waiting:entered", { meetingId });

          // Notify host of new waiting participant
          const hostSocketId = getHostSocketId(io, meetingId);
          if (hostSocketId) {
            io.to(hostSocketId).emit("waiting:new", {
              socketId: socket.id,
              ...userData,
            });
          }
        } else {
          // No waiting room — join directly
          socket.join(meetingId);
          roomManager.addParticipant(meetingId, socket.id, userData);

          const participants = roomManager.getParticipants(meetingId);
          socket.emit("room:joined", { meetingId, isHost: false, participants, waitingRoom: [] });

          socket.to(meetingId).emit("participant:joined", {
            socketId: socket.id,
            ...userData,
            isHost: false,
          });
        }
      } catch (err) {
        console.error("[room:join]", err);
        socket.emit("error", { message: "Failed to join meeting." });
      }
    });

    // ─────────────────────────────────────────────────────────────
    // HOST: APPROVE / DENY WAITING PARTICIPANT
    // ─────────────────────────────────────────────────────────────
    socket.on("waiting:approve", ({ meetingId, socketId }) => {
      const room = roomManager.getRoom(meetingId);
      if (!room || room.hostId !== socket.user._id.toString()) return;

      const user = roomManager.approveFromWaiting(meetingId, socketId);
      if (!user) return;

      const targetSocket = io.sockets.sockets.get(socketId);
      if (!targetSocket) return;

      targetSocket.join(meetingId);
      const participants = roomManager.getParticipants(meetingId);

      // Tell the approved user they can enter
      io.to(socketId).emit("room:joined", {
        meetingId,
        isHost: false,
        participants,
        waitingRoom: [],
      });

      // Tell everyone else about the new participant
      socket.to(meetingId).emit("participant:joined", {
        socketId,
        ...user,
        isHost: false,
      });
    });

    socket.on("waiting:deny", ({ meetingId, socketId }) => {
      const room = roomManager.getRoom(meetingId);
      if (!room || room.hostId !== socket.user._id.toString()) return;

      roomManager.removeParticipant(meetingId, socketId);
      io.to(socketId).emit("waiting:denied", { message: "The host did not admit you to the meeting." });
    });

    // ─────────────────────────────────────────────────────────────
    // WEBRTC SIGNALING
    // ─────────────────────────────────────────────────────────────
    socket.on("signal:offer", ({ to, offer }) => {
      io.to(to).emit("signal:offer", { from: socket.id, offer });
    });

    socket.on("signal:answer", ({ to, answer }) => {
      io.to(to).emit("signal:answer", { from: socket.id, answer });
    });

    socket.on("signal:ice-candidate", ({ to, candidate }) => {
      io.to(to).emit("signal:ice-candidate", { from: socket.id, candidate });
    });

    // ─────────────────────────────────────────────────────────────
    // MEDIA STATE (mute / video / hand)
    // ─────────────────────────────────────────────────────────────
    socket.on("media:mute-toggle", ({ meetingId, isMuted }) => {
      roomManager.updateParticipant(meetingId, socket.id, { isMuted });
      socket.to(meetingId).emit("participant:media-update", {
        socketId: socket.id,
        isMuted,
      });
    });

    socket.on("media:video-toggle", ({ meetingId, isVideoOff }) => {
      roomManager.updateParticipant(meetingId, socket.id, { isVideoOff });
      socket.to(meetingId).emit("participant:media-update", {
        socketId: socket.id,
        isVideoOff,
      });
    });

    socket.on("media:hand-raise", ({ meetingId, isHandRaised }) => {
      roomManager.updateParticipant(meetingId, socket.id, { isHandRaised });
      io.to(meetingId).emit("participant:hand-raise", {
        socketId: socket.id,
        name: socket.user.name,
        isHandRaised,
      });
    });

    // ─────────────────────────────────────────────────────────────
    // SCREEN SHARING
    // ─────────────────────────────────────────────────────────────
    socket.on("screen:start", ({ meetingId }) => {
      const success = roomManager.setScreenSharing(meetingId, socket.id);
      if (success) {
        socket.to(meetingId).emit("screen:started", {
          socketId: socket.id,
          name: socket.user.name,
        });
      } else {
        socket.emit("screen:error", { message: "Someone is already sharing their screen." });
      }
    });

    socket.on("screen:stop", ({ meetingId }) => {
      roomManager.clearScreenSharing(meetingId);
      socket.to(meetingId).emit("screen:stopped", { socketId: socket.id });
    });

    // ─────────────────────────────────────────────────────────────
    // CHAT
    // ─────────────────────────────────────────────────────────────
    socket.on("chat:message", ({ meetingId, message }) => {
      if (!message?.trim() || message.length > 1000) return;

      const payload = {
        id: `${Date.now()}-${socket.id}`,
        senderId: socket.user._id.toString(),
        senderName: socket.user.name,
        senderAvatar: socket.user.avatar || "",
        message: message.trim(),
        timestamp: new Date().toISOString(),
        type: "text",
        reactions: {},
      };

      io.to(meetingId).emit("chat:message", payload);
    });

    // File message — file already uploaded via REST /api/upload
    socket.on("chat:file", ({ meetingId, file }) => {
      if (!file?.url || !file?.originalName) return;

      const payload = {
        id: `${Date.now()}-${socket.id}`,
        senderId: socket.user._id.toString(),
        senderName: socket.user.name,
        senderAvatar: socket.user.avatar || "",
        message: file.originalName,
        timestamp: new Date().toISOString(),
        type: file.type || "file",
        file,
        reactions: {},
      };

      io.to(meetingId).emit("chat:message", payload);
    });

    // Emoji reaction on a message
    socket.on("chat:reaction", ({ meetingId, emoji, messageId }) => {
      io.to(meetingId).emit("chat:reaction", {
        messageId,
        emoji,
        senderId: socket.user._id.toString(),
        senderName: socket.user.name,
      });
    });

    // Active speaker detection
    socket.on("media:speaking", ({ meetingId, isSpeaking }) => {
      socket.to(meetingId).emit("participant:speaking", {
        socketId: socket.id,
        isSpeaking,
      });
    });

    // ─────────────────────────────────────────────────────────────
    // HOST CONTROLS
    // ─────────────────────────────────────────────────────────────

    // Force-mute a participant
    socket.on("host:mute-participant", ({ meetingId, socketId }) => {
      const room = roomManager.getRoom(meetingId);
      if (!room || room.hostId !== socket.user._id.toString()) return;

      roomManager.updateParticipant(meetingId, socketId, { isMuted: true });
      io.to(socketId).emit("host:force-mute");
      socket.to(meetingId).emit("participant:media-update", { socketId, isMuted: true });
    });

    // Remove a participant
    socket.on("host:remove-participant", ({ meetingId, socketId }) => {
      const room = roomManager.getRoom(meetingId);
      if (!room || room.hostId !== socket.user._id.toString()) return;

      io.to(socketId).emit("host:kicked", { message: "You have been removed from the meeting." });
      roomManager.removeParticipant(meetingId, socketId);
      io.to(meetingId).emit("participant:left", { socketId });

      const targetSocket = io.sockets.sockets.get(socketId);
      if (targetSocket) targetSocket.leave(meetingId);
    });

    // Lock / unlock meeting
    socket.on("host:lock-meeting", ({ meetingId, locked }) => {
      const room = roomManager.getRoom(meetingId);
      if (!room || room.hostId !== socket.user._id.toString()) return;

      roomManager.setLocked(meetingId, locked);
      io.to(meetingId).emit("meeting:lock-status", { locked });
    });

    // End meeting for everyone
    socket.on("host:end-meeting", async ({ meetingId }) => {
      const room = roomManager.getRoom(meetingId);
      if (!room || room.hostId !== socket.user._id.toString()) return;

      io.to(meetingId).emit("meeting:ended", { message: "The host has ended the meeting." });
      roomManager.destroyRoom(meetingId);

      // Persist ended status to DB
      try {
        await Meeting.findOneAndUpdate(
          { meetingId },
          { status: "ended", endedAt: new Date(), participants: [] }
        );
      } catch (err) {
        console.error("[host:end-meeting] DB update failed:", err.message);
      }
    });

    // ─────────────────────────────────────────────────────────────
    // DISCONNECT / LEAVE
    // ─────────────────────────────────────────────────────────────
    socket.on("room:leave", ({ meetingId }) => {
      handleLeave(socket, io, meetingId);
    });

    socket.on("disconnect", () => {
      const meetingId = roomManager.findRoomBySocket(socket.id);
      if (meetingId) handleLeave(socket, io, meetingId);
      console.log(`[Socket] Disconnected: ${socket.user.name} (${socket.id})`);
    });
  });
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function handleLeave(socket, io, meetingId) {
  roomManager.removeParticipant(meetingId, socket.id);
  socket.leave(meetingId);
  io.to(meetingId).emit("participant:left", { socketId: socket.id });

  // Clear screen share if this person was sharing
  const room = roomManager.getRoom(meetingId);
  if (room?.screenSharingSocketId === socket.id) {
    roomManager.clearScreenSharing(meetingId);
    io.to(meetingId).emit("screen:stopped", { socketId: socket.id });
  }
}

function getHostSocketId(io, meetingId) {
  const room = roomManager.getRoom(meetingId);
  if (!room) return null;
  for (const [socketId, p] of room.participants) {
    if (p.isHost) return socketId;
  }
  return null;
}

module.exports = registerSocketHandlers;
