const express = require("express");
const { body } = require("express-validator");
const {
  signup, verifyOTP, resendOTP,
  login,
  forgotPassword, resetPassword,
  logout, getMe, updateProfile,
} = require("../controllers/authController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

// Signup + OTP verification
router.post("/signup", [
  body("name").trim().notEmpty().withMessage("Name is required.").isLength({ min: 2, max: 50 }),
  body("email").trim().isEmail().withMessage("Valid email is required."),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
], signup);

router.post("/verify-otp",  verifyOTP);
router.post("/resend-otp",  resendOTP);

// Login — no OTP, just password
router.post("/login", [
  body("email").trim().isEmail().withMessage("Valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
], login);

// Forgot / reset password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);

// Protected
router.post("/logout",  protect, logout);
router.get("/me",       protect, getMe);
router.put("/profile",  protect, updateProfile);

module.exports = router;
