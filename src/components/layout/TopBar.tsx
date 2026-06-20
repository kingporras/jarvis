import type { RouteDefinition } from "../../types/common";

interface TopBarProps {
  activeRoute: RouteDefinition;
}

export function TopBar({ activeRoute }: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <span className="topbar__kicker">JARVIS</span>
        <strong>{activeRoute.title}</strong>
      </div>
    </header>
  );
}
