const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: Date.now },
    isHost: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    isVideoOff: { type: Boolean, default: false },
    isHandRaised: { type: Boolean, default: false },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Meeting title is required."],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters."],
    },
    meetingId: {
      type: String,
      unique: true,
      default: () => uuidv4().replace(/-/g, "").slice(0, 12).toUpperCase(),
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [participantSchema],

    // Security
    password: {
      type: String,
      default: null, // null = no password required
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    waitingRoom: {
      type: Boolean,
      default: true,
    },

    // State
    status: {
      type: String,
      enum: ["scheduled", "active", "ended"],
      default: "scheduled",
    },
    startedAt: { type: Date, default: null },
    endedAt:   { type: Date, default: null },

    // Scheduling
    scheduledAt: { type: Date, default: null },

    // Runtime — not stored in DB, managed in memory via socket
    // (kept here for reference of what the in-memory room object looks like)
  },
  { timestamps: true }
);

// Virtual: participant count
meetingSchema.virtual("participantCount").get(function () {
  return this.participants.length;
});

// Mask password field in JSON output
meetingSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  if (obj.password) obj.hasPassword = true;
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("Meeting", meetingSchema);
