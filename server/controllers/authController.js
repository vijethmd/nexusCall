const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const { generateOTP, sendOTPEmail, sendForgotPasswordEmail } = require("../config/email");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ── POST /api/auth/signup ────────────────────────────────────────
// Creates unverified account, sends OTP email
const signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: errors.array()[0].msg });

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }

    const otp       = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // If account exists but unverified, update it; otherwise create new
    let user;
    if (existing && !existing.isVerified) {
      existing.name      = name;
      existing.password  = password; // will be rehashed by pre-save hook
      existing.otp       = otp;
      existing.otpExpiry = otpExpiry;
      user = await existing.save();
    } else {
      user = await User.create({ name, email, password, otp, otpExpiry, isVerified: false });
    }

    await sendOTPEmail(email, name, otp);

    res.status(201).json({
      success: true,
      message: "Check your email for the 6-digit verification code.",
      userId: user._id,
      email:  user.email,
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/verify-otp ────────────────────────────────────
// Verifies OTP, activates account, returns JWT
const verifyOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp)
      return res.status(400).json({ success: false, message: "User ID and code are required." });

    const user = await User.findById(userId).select("+otp +otpExpiry");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    if (user.isVerified)
      return res.status(400).json({ success: false, message: "Account is already verified." });

    if (!user.otp || user.otp !== otp.trim())
      return res.status(400).json({ success: false, message: "Incorrect code. Please try again." });

    if (new Date() > user.otpExpiry)
      return res.status(400).json({ success: false, message: "Code has expired. Please request a new one." });

    user.isVerified = true;
    user.otp        = undefined;
    user.otpExpiry  = undefined;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Email verified. Welcome to Nexus!",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/resend-otp ────────────────────────────────────
const resendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });
    if (user.isVerified)
      return res.status(400).json({ success: false, message: "Account already verified." });

    const otp       = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otp        = otp;
    user.otpExpiry  = otpExpiry;
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail(user.email, user.name, otp);

    res.status(200).json({ success: true, message: "New verification code sent." });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/login ─────────────────────────────────────────
// No OTP on login — only checks password + verified status
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: errors.array()[0].msg });

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid email or password." });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid email or password." });

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before signing in. Check your inbox or sign up again.",
      });
    }

    user.isOnline = true;
    user.lastSeen = Date.now();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/forgot-password ──────────────────────────────
// Sends reset OTP to email
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond success to prevent email enumeration
    if (!user || !user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "If an account exists for this email, a reset code has been sent.",
      });
    }

    const otp       = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp       = otp;
    user.otpExpiry = otpExpiry;
    await user.save({ validateBeforeSave: false });

    await sendForgotPasswordEmail(user.email, user.name, otp);

    res.status(200).json({
      success: true,
      message: "A reset code has been sent to your email.",
      userId: user._id, // needed for next step
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/reset-password ───────────────────────────────
// Verifies reset OTP then updates password
const resetPassword = async (req, res, next) => {
  try {
    const { userId, otp, newPassword } = req.body;

    if (!userId || !otp || !newPassword)
      return res.status(400).json({ success: false, message: "All fields are required." });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });

    const user = await User.findById(userId).select("+otp +otpExpiry");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    if (!user.otp || user.otp !== otp.trim())
      return res.status(400).json({ success: false, message: "Incorrect reset code." });

    if (new Date() > user.otpExpiry)
      return res.status(400).json({ success: false, message: "Reset code has expired. Please request a new one." });

    user.password  = newPassword; // pre-save hook rehashes
    user.otp       = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated. You can now sign in." });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/logout ────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isOnline: false, lastSeen: Date.now() });
    res.status(200).json({ success: true, message: "Logged out." });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/auth/me ─────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/auth/profile ────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id, { name, avatar }, { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, message: "Profile updated.", user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup, verifyOTP, resendOTP,
  login,
  forgotPassword, resetPassword,
  logout, getMe, updateProfile,
};
