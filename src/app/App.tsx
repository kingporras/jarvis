import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
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
  const isLoginPath = currentPath === "/login" || currentPath === "/login/";

  useEffect(() => {
    if (isLoginPath) {
      window.history.replaceState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [isLoginPath]);

  function handleNavigate(page: PageKey) {
    const route = getRouteByKey(page);
    window.history.pushState({}, "", route.path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <AppShell
      activePage={activeRoute.key}
      activeRoute={activeRoute}
      onNavigate={handleNavigate}
    >
      <ActivePage />
    </AppShell>
  );
}

export function App() {
  return <AppRoutes />;
}
