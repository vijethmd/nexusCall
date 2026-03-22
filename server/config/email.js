const nodemailer = require("nodemailer");

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Always send real email via nodemailer using SMTP credentials from .env
const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Nexus" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

const sendOTPEmail = async (email, name, otp) => {
  // In development, also log to console as fallback
  console.log(`\n[OTP] ${email} → ${otp}\n`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // No SMTP configured — console only
    return;
  }

  await sendEmail({
    to: email,
    subject: "Verify your Nexus account",
    html: `
      <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:40px 24px;">
        <div style="margin-bottom:24px;">
          <span style="background:#6366f1;color:#fff;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:600;">Nexus</span>
        </div>
        <h2 style="color:#0f172a;font-size:24px;margin:0 0 8px;">Verify your email</h2>
        <p style="color:#475569;font-size:15px;margin:0 0 28px;">Hi ${name}, enter this code to complete your signup.</p>
        <div style="background:#f1f5f9;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
          <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#0f172a;font-family:monospace;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0 0 4px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#94a3b8;font-size:12px;margin:0;">If you did not sign up for Nexus, you can safely ignore this email.</p>
      </div>
    `,
  });
};

const sendForgotPasswordEmail = async (email, name, otp) => {
  console.log(`\n[RESET OTP] ${email} → ${otp}\n`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  await sendEmail({
    to: email,
    subject: "Reset your Nexus password",
    html: `
      <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:40px 24px;">
        <div style="margin-bottom:24px;">
          <span style="background:#6366f1;color:#fff;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:600;">Nexus</span>
        </div>
        <h2 style="color:#0f172a;font-size:24px;margin:0 0 8px;">Reset your password</h2>
        <p style="color:#475569;font-size:15px;margin:0 0 28px;">Hi ${name}, use this code to reset your password.</p>
        <div style="background:#fef3c7;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
          <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#92400e;font-family:monospace;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0 0 4px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#94a3b8;font-size:12px;margin:0;">If you did not request a password reset, ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { generateOTP, sendOTPEmail, sendForgotPasswordEmail };
