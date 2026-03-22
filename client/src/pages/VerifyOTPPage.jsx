import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import useAuthStore from "../store/authStore";
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

const VerifyOTPPage = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { setAuth } = useAuthStore();

  const userId = location.state?.userId;
  const email  = location.state?.email;

  const [otp,       setOtp]       = useState(["", "", "", "", "", ""]);
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error,     setError]     = useState("");
  const inputs = useRef([]);

  useEffect(() => {
    if (!userId) { navigate("/signup"); return; }
    const t = setInterval(() => setCountdown((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [userId, navigate]);

  const otpValue = otp.join("");

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    setError("");
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = async (digits) => {
    const code = digits || otpValue;
    if (code.length < 6) { setError("Enter the full 6-digit code."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/verify-otp", { userId, otp: code });
      setAuth(res.data.token, res.data.user);
      toast.success("Email verified. Welcome to Nexus!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed.");
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otpValue.length === 6) handleVerify(otpValue);
  }, [otpValue]);

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { userId });
      toast.success("New code sent.");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      setError("");
      inputs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not resend.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-base">
      <div className="flex items-center justify-between px-6 py-4">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-slide-up">

          <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-brand-400" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-primary">Verify your email</h2>
            <p className="text-secondary text-sm mt-2">
              We sent a 6-digit code to
            </p>
            <p className="font-medium text-primary text-sm mt-0.5">{email}</p>
            <p className="text-xs text-muted mt-2">
              In development mode the code is printed to the server console.
            </p>
          </div>

          {/* OTP boxes */}
          <div className="flex gap-2 justify-center mb-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                autoFocus={i === 0}
                className={`w-11 text-center text-xl font-bold font-mono rounded-xl border-2 transition-all duration-150
                  focus:outline-none focus:border-brand-500 bg-elevated text-primary
                  ${error ? "border-red-500" : "border-theme"}`}
                style={{ height: "52px" }}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-xs text-red-400 mb-4">{error}</p>
          )}

          <div className="space-y-4 mt-6">
            <Button
              onClick={() => handleVerify()}
              loading={loading}
              className="w-full"
              size="lg"
              disabled={otpValue.length < 6}
            >
              Verify email
            </Button>

            <p className="text-center text-sm text-secondary">
              Didn't receive it?{" "}
              {countdown > 0 ? (
                <span className="text-muted">Resend in {countdown}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-brand-500 hover:text-brand-400 font-medium transition-colors"
                >
                  {resending ? "Sending..." : "Resend code"}
                </button>
              )}
            </p>

            <p className="text-center">
              <Link to="/signup" className="text-xs text-muted hover:text-secondary transition-colors">
                Use a different email
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTPPage;
