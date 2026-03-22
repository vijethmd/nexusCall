const express = require("express");
const { body } = require("express-validator");
const {
  createMeeting,
  validateJoin,
  getMeeting,
  getMyMeetings,
  endMeeting,
} = require("../controllers/meetingController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

// All meeting routes require authentication
router.use(protect);

router.get("/", getMyMeetings);

router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Meeting title is required.")
      .isLength({ max: 100 }).withMessage("Title cannot exceed 100 characters."),
  ],
  createMeeting
);

router.post("/join", validateJoin);

router.get("/:meetingId", getMeeting);

router.patch("/:meetingId/end", endMeeting);

module.exports = router;
