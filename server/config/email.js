const https = require("https");

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendBrevoEmail = async ({ to, toName, subject, html }) => {
  const payload = JSON.stringify({
    sender: {
      name:  "Nexus",
      email: process.env.BREVO_FROM_EMAIL,
    },
    to: [{ email: to, name: toName }],
    subject,
    htmlContent: html,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.brevo.com",
        path:     "/v3/smtp/email",
        method:   "POST",
        headers: {
          "Content-Type":   "application/json",
          "api-key":        process.env.BREVO_API_KEY,
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Brevo API error ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
};

const sendOTPEmail = async (email, name, otp) => {
  console.log(`\n[OTP] ${email} → ${otp}\n`);

  if (!process.env.BREVO_API_KEY) {
    console.log("[Email] No BREVO_API_KEY — OTP logged to console only.");
    return;
  }

  await sendBrevoEmail({
    to:      email,
    toName:  name,
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
        <p style="color:#64748b;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#94a3b8;font-size:12px;">If you did not sign up for Nexus, ignore this email.</p>
      </div>
    `,
  });
};

const sendForgotPasswordEmail = async (email, name, otp) => {
  console.log(`\n[RESET OTP] ${email} → ${otp}\n`);

  if (!process.env.BREVO_API_KEY) {
    console.log("[Email] No BREVO_API_KEY — OTP logged to console only.");
    return;
  }

  await sendBrevoEmail({
    to:      email,
    toName:  name,
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
        <p style="color:#64748b;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#94a3b8;font-size:12px;">If you did not request this, ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { generateOTP, sendOTPEmail, sendForgotPasswordEmail };
