import { useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";

interface RequireAuthProps {
  children: ReactNode;
}

function loginUrlForCurrentPath() {
  const next = `${window.location.pathname}${window.location.search}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.history.replaceState({}, "", loginUrlForCurrentPath());
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="auth-screen">
        <div className="auth-card card">
          <span className="topbar__kicker">JARVIS</span>
          <h1>Verificando sesion</h1>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
