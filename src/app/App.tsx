import { useMemo, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { getRouteByKey } from "./routes";
import type { PageKey } from "../types/common";

export function App() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const activeRoute = useMemo(() => getRouteByKey(activePage), [activePage]);
  const ActivePage = activeRoute.component;

  return (
    <AppShell
      activePage={activePage}
      activeRoute={activeRoute}
      onNavigate={setActivePage}
    >
      <ActivePage />
    </AppShell>
  );
}
