import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/app/providers/auth-provider";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-sm text-muted">Ładowanie sesji...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user } = useAuth();

  if (!user || user.global_role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

