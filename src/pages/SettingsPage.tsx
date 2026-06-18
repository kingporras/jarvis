import { useAuth } from "../auth/AuthProvider";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { AUTH_ENABLED } from "../../shared/auth-config";

const settings = [
  { label: "Modelo IA futuro", value: "No configurado" },
  { label: "Exportación JSON", value: "Planificada" },
  { label: "Tema visual", value: "Oscuro privado" },
  { label: "Backend", value: "Pendiente Sprint 2" }
];

export function SettingsPage() {
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    window.history.replaceState({}, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Preferencias de sistema reservadas para fases posteriores, sin secretos ni variables privadas."
        eyebrow="Sistema"
        title="Ajustes"
      />

      <Card className="panel">
        <div className="panel__header">
          <div>
          <span>Configuración inicial</span>
            <h2>Base preparada</h2>
          </div>
          <Badge tone="success">Local</Badge>
        </div>
        <div className="settings-list">
          {settings.map((setting) => (
            <div className="settings-row" key={setting.label}>
              <span>{setting.label}</span>
              <strong>{setting.value}</strong>
            </div>
          ))}
        </div>
      </Card>

      {AUTH_ENABLED ? (
        <Card className="panel">
          <div className="panel__header">
            <div>
              <span>Acceso privado</span>
              <h2>Sesion de Victor</h2>
            </div>
            <Button onClick={handleLogout} variant="secondary">
              Cerrar sesion
            </Button>
          </div>
        </Card>
      ) : null}

      <EmptyState
        badge="Exportación futura"
        description="La exportación JSON y la selección de modelo se implementarán cuando existan datos y backend reales."
        title="Sin configuración sensible"
      />
    </div>
  );
}
