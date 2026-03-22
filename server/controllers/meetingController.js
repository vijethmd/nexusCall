const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const Meeting = require("../models/Meeting");

// POST /api/meetings — Create a new meeting
const createMeeting = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { title, password, waitingRoom, scheduledAt } = req.body;

    let hashedPassword = null;
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password.trim(), salt);
    }

    const meeting = await Meeting.create({
      title,
      host: req.user._id,
      password: hashedPassword,
      waitingRoom: waitingRoom !== undefined ? waitingRoom : true,
      scheduledAt: scheduledAt || null,
      status: scheduledAt ? "scheduled" : "active",
      startedAt: scheduledAt ? null : new Date(),
      participants: [{ user: req.user._id, isHost: true }],
    });

    await meeting.populate("host", "name email avatar");

    res.status(201).json({
      success: true,
      message: "Meeting created.",
      meeting: meeting.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/meetings/join — Validate meeting ID + password before socket join
const validateJoin = async (req, res, next) => {
  try {
    const { meetingId, password } = req.body;

    if (!meetingId) {
      return res.status(400).json({ success: false, message: "Meeting ID is required." });
    }

    const meeting = await Meeting.findOne({ meetingId: meetingId.toUpperCase() })
      .populate("host", "name email avatar");

    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found. Check the ID and try again." });
    }

    if (meeting.status === "ended") {
      return res.status(410).json({ success: false, message: "This meeting has ended." });
    }

    if (meeting.isLocked) {
      return res.status(403).json({ success: false, message: "This meeting is locked. No new participants can join." });
    }

    // Password check
    if (meeting.password) {
      if (!password) {
        return res.status(401).json({ success: false, message: "This meeting requires a password.", requiresPassword: true });
      }
      const isMatch = await bcrypt.compare(password, meeting.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Incorrect meeting password.", requiresPassword: true });
      }
    }

    const isHost = meeting.host._id.toString() === req.user._id.toString();

    res.status(200).json({
      success: true,
      message: "Validation passed.",
      meeting: meeting.toSafeObject(),
      isHost,
      requiresWaiting: meeting.waitingRoom && !isHost,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/meetings/:meetingId — Get meeting details
const getMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId.toUpperCase() })
      .populate("host", "name email avatar")
      .populate("participants.user", "name email avatar");

    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found." });
    }

    res.status(200).json({ success: true, meeting: meeting.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// GET /api/meetings — Get all meetings for current user (as host)
const getMyMeetings = async (req, res, next) => {
  try {
    const meetings = await Meeting.find({ host: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("host", "name email avatar");

    res.status(200).json({
      success: true,
      meetings: meetings.map((m) => m.toSafeObject()),
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/meetings/:meetingId/end — End meeting (host only)
const endMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId.toUpperCase() });

    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found." });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the host can end the meeting." });
    }

    meeting.status = "ended";
    meeting.endedAt = new Date();
    meeting.participants = [];
    await meeting.save();

    res.status(200).json({ success: true, message: "Meeting ended." });
  } catch (error) {
    next(error);
  }
};

module.exports = { createMeeting, validateJoin, getMeeting, getMyMeetings, endMeeting };
