import { useEffect, useMemo, useState } from "react";
import { AuthProvider } from "../auth/AuthProvider";
import { RequireAuth } from "../auth/RequireAuth";
import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../pages/LoginPage";
import type { PageKey } from "../types/common";
import { AUTH_ENABLED } from "../../shared/auth-config";
import { getRouteByKey, getRouteByPath } from "./routes";

function useCurrentPath() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    function handleLocationChange() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  return path;
}

function AppRoutes() {
  const currentPath = useCurrentPath();
  const activeRoute = useMemo(() => getRouteByPath(currentPath), [currentPath]);
  const ActivePage = activeRoute.component;
  const isLoginPath = currentPath === "/login" || currentPath === "/login/";

  useEffect(() => {
    if (!AUTH_ENABLED && isLoginPath) {
      window.history.replaceState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [isLoginPath]);

  function handleNavigate(page: PageKey) {
    const route = getRouteByKey(page);
    window.history.pushState({}, "", route.path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  if (AUTH_ENABLED && isLoginPath) {
    return <LoginPage />;
  }

  return (
    <RequireAuth>
      <AppShell
        activePage={activeRoute.key}
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
      >
        <ActivePage />
      </AppShell>
    </RequireAuth>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
