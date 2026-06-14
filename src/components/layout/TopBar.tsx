import type { RouteDefinition } from "../../types/common";
import { Badge } from "../ui/Badge";

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
      <div className="topbar__status" aria-label="Estado del sistema">
        <Badge tone="success">PWA base</Badge>
        <Badge>Sin APIs</Badge>
      </div>
    </header>
  );
}
