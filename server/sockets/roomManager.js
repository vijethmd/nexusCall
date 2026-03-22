/**
 * In-memory room state manager.
 *
 * Each room entry:
 * {
 *   meetingId: string,
 *   hostId: string,
 *   participants: Map<socketId, { userId, name, avatar, isMuted, isVideoOff, isHandRaised }>,
 *   waitingRoom: Map<socketId, { userId, name, avatar }>,
 *   isLocked: boolean,
 *   screenSharingSocketId: string | null,
 * }
 */

const rooms = new Map();

const roomManager = {
  // Create or return existing room
  getOrCreate(meetingId, hostId) {
    if (!rooms.has(meetingId)) {
      rooms.set(meetingId, {
        meetingId,
        hostId,
        participants: new Map(),
        waitingRoom: new Map(),
        isLocked: false,
        screenSharingSocketId: null,
      });
    }
    return rooms.get(meetingId);
  },

  getRoom(meetingId) {
    return rooms.get(meetingId) || null;
  },

  // Add participant directly (host or already-approved)
  addParticipant(meetingId, socketId, userData) {
    const room = rooms.get(meetingId);
    if (!room) return false;
    room.participants.set(socketId, {
      socketId,
      userId: userData.userId,
      name: userData.name,
      avatar: userData.avatar || "",
      isMuted: false,
      isVideoOff: false,
      isHandRaised: false,
      isHost: userData.userId === room.hostId,
    });
    return true;
  },

  // Move participant from waiting room to active
  approveFromWaiting(meetingId, socketId) {
    const room = rooms.get(meetingId);
    if (!room) return null;
    const user = room.waitingRoom.get(socketId);
    if (!user) return null;
    room.waitingRoom.delete(socketId);
    room.participants.set(socketId, { ...user, isMuted: false, isVideoOff: false, isHandRaised: false });
    return user;
  },

  addToWaiting(meetingId, socketId, userData) {
    const room = rooms.get(meetingId);
    if (!room) return false;
    room.waitingRoom.set(socketId, { socketId, ...userData });
    return true;
  },

  removeParticipant(meetingId, socketId) {
    const room = rooms.get(meetingId);
    if (!room) return;
    room.participants.delete(socketId);
    room.waitingRoom.delete(socketId);

    // If screensharing user left, clear it
    if (room.screenSharingSocketId === socketId) {
      room.screenSharingSocketId = null;
    }

    // Clean up empty rooms
    if (room.participants.size === 0 && room.waitingRoom.size === 0) {
      rooms.delete(meetingId);
    }
  },

  getParticipants(meetingId) {
    const room = rooms.get(meetingId);
    if (!room) return [];
    return Array.from(room.participants.values());
  },

  getWaitingRoom(meetingId) {
    const room = rooms.get(meetingId);
    if (!room) return [];
    return Array.from(room.waitingRoom.values());
  },

  updateParticipant(meetingId, socketId, updates) {
    const room = rooms.get(meetingId);
    if (!room) return;
    const p = room.participants.get(socketId);
    if (p) room.participants.set(socketId, { ...p, ...updates });
  },

  setScreenSharing(meetingId, socketId) {
    const room = rooms.get(meetingId);
    if (!room) return false;
    // Only one active screen share at a time
    if (room.screenSharingSocketId && room.screenSharingSocketId !== socketId) return false;
    room.screenSharingSocketId = socketId;
    return true;
  },

  clearScreenSharing(meetingId) {
    const room = rooms.get(meetingId);
    if (room) room.screenSharingSocketId = null;
  },

  setLocked(meetingId, locked) {
    const room = rooms.get(meetingId);
    if (room) room.isLocked = locked;
  },

  destroyRoom(meetingId) {
    rooms.delete(meetingId);
  },

  // Find which room a socket is in
  findRoomBySocket(socketId) {
    for (const [meetingId, room] of rooms) {
      if (room.participants.has(socketId) || room.waitingRoom.has(socketId)) {
        return meetingId;
      }
    }
    return null;
  },
};

module.exports = roomManager;
