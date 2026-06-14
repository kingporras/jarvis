import type { ReactNode } from "react";
import type { PageKey, RouteDefinition } from "../../types/common";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  activePage: PageKey;
  activeRoute: RouteDefinition;
  children: ReactNode;
  onNavigate: (page: PageKey) => void;
}

export function AppShell({ activePage, activeRoute, children, onNavigate }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="app-shell__main">
        <TopBar activeRoute={activeRoute} />
        <main className="app-content" id="main-content">
          {children}
        </main>
      </div>
      <MobileNav activePage={activePage} onNavigate={onNavigate} />
    </div>
  );
}
