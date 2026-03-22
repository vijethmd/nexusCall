import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import ThemeToggle from "../components/ui/ThemeToggle";

const FEATURES = [
  "Crystal-clear HD video",
  "Noise suppression built-in",
  "Screen and tab sharing",
  "Real-time meeting chat",
  "Waiting room and host controls",
  "End-to-end peer-to-peer video",
];

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

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();

  const [form,   setForm]   = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email address.";
    if (!form.password) errs.password = "Password is required.";
    return errs;
  };

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const result = await login(form);
    if (result.success) {
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex bg-base">
      {/* Left branding panel */}
      <aside className="hidden lg:flex flex-col justify-between w-[46%] p-12 border-r border-theme bg-surface">
        <Logo />
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Video conferencing</p>
            <h1 className="text-[2.6rem] font-bold leading-tight text-primary">
              Connect with your<br />team,{" "}
              <span className="text-gradient">anywhere.</span>
            </h1>
            <p className="text-secondary text-lg leading-relaxed max-w-sm">
              High-quality video meetings with everything your team needs.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-secondary text-sm">
                <div className="w-4 h-4 rounded-full bg-brand-600/20 border border-brand-500/50 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-muted text-xs">© {new Date().getFullYear()} Nexus. All rights reserved.</p>
      </aside>

      {/* Right form panel */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="lg:hidden"><Logo /></div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/signup" className="btn-secondary text-sm px-4 py-2">Create account</Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm animate-slide-up">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-primary">Sign in</h2>
              <p className="text-secondary mt-1 text-sm">
                Don't have an account?{" "}
                <Link to="/signup" className="text-brand-500 hover:text-brand-400 font-medium transition-colors">
                  Sign up free
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email address"
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                autoComplete="email"
              />

              <div className="relative">
                <Input
                  label="Password"
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  placeholder="Your password"
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                  autoComplete="current-password"
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

              {/* Forgot password link */}
              <div className="text-right -mt-1">
                <Link to="/forgot-password" className="text-xs text-brand-500 hover:text-brand-400 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
