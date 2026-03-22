import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import ThemeToggle from "../components/ui/ThemeToggle";

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2.5">
        <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    </div>
    <span className="text-lg font-semibold tracking-tight text-primary">Nexus</span>
  </div>
);

// Single-page 3-step forgot password flow:
// Step 1: Enter email
// Step 2: Enter OTP sent to email
// Step 3: Enter new password

const STEPS = { EMAIL: "email", OTP: "otp", PASSWORD: "password", DONE: "done" };

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [step,      setStep]      = useState(STEPS.EMAIL);
  const [email,     setEmail]     = useState("");
  const [userId,    setUserId]    = useState("");
  const [otp,       setOtp]       = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  // ── Step 1: Request reset OTP ──────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      if (res.data.userId) setUserId(res.data.userId);
      toast.success("Reset code sent. Check your email (or server console).");
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) { setError("Enter the 6-digit code."); return; }
    // We just advance locally — actual OTP is verified on password reset
    setError("");
    setStep(STEPS.PASSWORD);
  };

  // ── Step 3: Set new password ───────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { userId, otp: otp.trim(), newPassword: password });
      toast.success("Password updated! You can now sign in.");
      setStep(STEPS.DONE);
    } catch (err) {
      const msg = err.response?.data?.message || "Reset failed.";
      setError(msg);
      // If OTP was wrong/expired, go back to OTP step
      if (msg.toLowerCase().includes("code") || msg.toLowerCase().includes("expired")) {
        setStep(STEPS.OTP);
        setOtp("");
      }
    } finally {
      setLoading(false);
    }
  };

  const stepNumber = { [STEPS.EMAIL]: 1, [STEPS.OTP]: 2, [STEPS.PASSWORD]: 3 };

  return (
    <div className="min-h-screen flex flex-col bg-base">
      <div className="flex items-center justify-between px-6 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login" className="btn-secondary text-sm px-4 py-2">Sign in</Link>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-slide-up">

          {/* Step indicator */}
          {step !== STEPS.DONE && (
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map((n) => {
                const current = stepNumber[step] || 0;
                return (
                  <div key={n} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                      ${n < current  ? "bg-brand-600 text-white" :
                        n === current ? "bg-brand-600 text-white ring-4 ring-brand-500/20" :
                        "bg-elevated text-muted border border-theme"}`}
                    >
                      {n < current ? (
                        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : n}
                    </div>
                    {n < 3 && <div className={`w-8 h-px ${n < current ? "bg-brand-600" : "bg-theme"}`} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Step 1: Email ── */}
          {step === STEPS.EMAIL && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-primary">Forgot password?</h2>
                <p className="text-secondary text-sm mt-1.5">
                  Enter your email and we'll send you a reset code.
                </p>
              </div>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  error={error}
                  autoFocus
                />
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Send reset code
                </Button>
                <p className="text-center text-sm text-secondary">
                  Remember it?{" "}
                  <Link to="/login" className="text-brand-500 hover:text-brand-400 font-medium">Sign in</Link>
                </p>
              </form>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === STEPS.OTP && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-primary">Enter reset code</h2>
                <p className="text-secondary text-sm mt-1.5">
                  We sent a 6-digit code to <span className="text-primary font-medium">{email}</span>.
                  <br />
                  <span className="text-xs text-muted">In dev mode, check the server console.</span>
                </p>
              </div>
              <form onSubmit={handleOTPSubmit} className="space-y-4">
                <Input
                  label="6-digit code"
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  error={error}
                  className="font-mono tracking-widest text-lg text-center"
                  maxLength={6}
                  autoFocus
                />
                <Button type="submit" className="w-full" size="lg" disabled={otp.length < 6}>
                  Continue
                </Button>
                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep(STEPS.EMAIL); setError(""); }}
                    className="text-muted hover:text-secondary transition-colors"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleEmailSubmit}
                    className="text-brand-500 hover:text-brand-400 font-medium transition-colors"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 3: New password ── */}
          {step === STEPS.PASSWORD && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-primary">Set new password</h2>
                <p className="text-secondary text-sm mt-1.5">Choose a strong password for your account.</p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    label="New password"
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-[34px] text-muted hover:text-secondary transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? (
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                <Input
                  label="Confirm password"
                  id="confirm"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                  error={error}
                />

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Update password
                </Button>
              </form>
            </>
          )}

          {/* ── Done ── */}
          {step === STEPS.DONE && (
            <div className="text-center animate-slide-up">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-emerald-400" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-primary mb-2">Password updated</h2>
              <p className="text-secondary text-sm mb-8">Your password has been reset successfully.</p>
              <Button onClick={() => navigate("/login")} className="w-full" size="lg">
                Sign in now
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
