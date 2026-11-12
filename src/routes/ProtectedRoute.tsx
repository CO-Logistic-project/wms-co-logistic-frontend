import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status, mustChangePassword } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <main className="session-loading" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <p>Validando sesión…</p>
      </main>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && location.pathname !== "/cambiar-contrasena") return <Navigate to="/cambiar-contrasena" replace />;

  return children;
}

export default ProtectedRoute;
