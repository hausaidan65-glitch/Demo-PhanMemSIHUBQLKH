import { Navigate, Outlet } from "react-router-dom";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

export default function ProtectedAdminRoute() {
  const token = localStorage.getItem("admin_token");

  let admin = null;

  try {
    admin = JSON.parse(localStorage.getItem("admin_info") || "null");
  } catch (error) {
    console.error("Không thể đọc thông tin Admin:", error);
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!admin || !ADMIN_ROLES.includes(admin.role)) {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_info");

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
