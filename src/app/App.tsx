import { useEffect, useMemo, useState } from "react";
import { AuthProvider } from "../auth/AuthProvider";
import { RequireAuth } from "../auth/RequireAuth";
import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../pages/LoginPage";
import type { PageKey } from "../types/common";
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

  function handleNavigate(page: PageKey) {
    const route = getRouteByKey(page);
    window.history.pushState({}, "", route.path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  if (currentPath === "/login" || currentPath === "/login/") {
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
