import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyOTPPage from "./pages/VerifyOTPPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import PreJoinPage from "./pages/PreJoinPage";
import WaitingRoom from "./pages/WaitingRoom";
import MeetingRoom from "./pages/MeetingRoom";

const App = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#f1f5f9",
            border: "1px solid #334155",
            borderRadius: "12px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#6366f1", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
          duration: 4000,
        }}
      />
      <Routes>
        {/* Public auth routes */}
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/signup"           element={<SignupPage />} />
        <Route path="/verify-otp"       element={<VerifyOTPPage />} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard"                  element={<DashboardPage />} />
          <Route path="/meeting/:meetingId"         element={<PreJoinPage />} />
          <Route path="/meeting/:meetingId/waiting" element={<WaitingRoom />} />
          <Route path="/meeting/:meetingId/room"    element={<MeetingRoom />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
