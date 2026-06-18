import type { RouteDefinition } from "../../types/common";
import { useAuth } from "../../auth/AuthProvider";
import { AUTH_ENABLED } from "../../../shared/auth-config";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface TopBarProps {
  activeRoute: RouteDefinition;
}

export function TopBar({ activeRoute }: TopBarProps) {
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    window.history.replaceState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <header className="topbar">
      <div>
        <span className="topbar__kicker">JARVIS</span>
        <strong>{activeRoute.title}</strong>
      </div>
      {AUTH_ENABLED ? (
        <div className="topbar__status" aria-label="Estado del sistema">
          <Badge tone="success">Privado</Badge>
          <Badge>Sesion Victor</Badge>
          <Button className="topbar__logout" onClick={handleLogout} variant="ghost">
            Salir
          </Button>
        </div>
      ) : null}
    </header>
  );
}
