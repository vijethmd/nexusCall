import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";

// Falls back to localStorage so a page refresh doesn't log the user out
const ProtectedRoute = () => {
  const token = useAuthStore((s) => s.token) || localStorage.getItem("token");
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
