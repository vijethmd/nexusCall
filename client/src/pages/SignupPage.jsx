import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
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

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, loading } = useAuthStore();

  const [form,   setForm]   = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name.trim())           errs.name    = "Name is required.";
    else if (form.name.trim().length < 2) errs.name = "Name must be at least 2 characters.";
    if (!form.email)                 errs.email   = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email.";
    if (!form.password)              errs.password = "Password is required.";
    else if (form.password.length < 6) errs.password = "Minimum 6 characters.";
    if (form.password !== form.confirm) errs.confirm = "Passwords do not match.";
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
    const result = await signup({ name: form.name.trim(), email: form.email, password: form.password });
    if (result.success) {
      toast.success("Check your email for the 6-digit code.");
      navigate("/verify-otp", { state: { userId: result.userId, email: result.email } });
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex bg-base">
      {/* Left panel */}
      <aside className="hidden lg:flex flex-col justify-between w-[46%] p-12 border-r border-theme bg-surface">
        <Logo />

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Get started free</p>
            <h1 className="text-[2.6rem] font-bold leading-tight text-primary">
              Your meetings,<br />
              <span className="text-gradient">elevated.</span>
            </h1>
            <p className="text-secondary text-lg leading-relaxed max-w-sm">
              Join thousands of teams relying on Nexus for reliable, beautiful video meetings.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { title: "Free forever",        desc: "No credit card required." },
              { title: "Unlimited meetings",  desc: "No time limits or restrictions." },
              { title: "Up to 100 participants", desc: "Scale easily as your team grows." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-600/20 border border-brand-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-brand-400" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">{item.title}</p>
                  <p className="text-xs text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-muted text-xs">© {new Date().getFullYear()} Nexus. All rights reserved.</p>
      </aside>

      {/* Right form panel */}
      <main className="flex flex-1 flex-col min-h-screen">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="lg:hidden"><Logo /></div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="btn-secondary text-sm px-4 py-2">
              Sign in
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm animate-slide-up">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-primary">Create your account</h2>
              <p className="text-secondary mt-1 text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-brand-500 hover:text-brand-400 font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Input
                label="Full name"
                id="name"
                name="name"
                type="text"
                placeholder="Jane Smith"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                autoComplete="name"
              />

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
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                  autoComplete="new-password"
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
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <Input
                label="Confirm password"
                id="confirm"
                name="confirm"
                type="password"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={handleChange}
                error={errors.confirm}
                autoComplete="new-password"
              />

              <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
                Create account
              </Button>

              <p className="text-center text-xs text-muted pt-1">
                By signing up you agree to our Terms and Privacy Policy.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignupPage;
