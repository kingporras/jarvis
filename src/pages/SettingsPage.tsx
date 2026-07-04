import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { DemoNotice } from "../components/ui/DemoNotice";
import { SectionHeader } from "../components/ui/SectionHeader";
import { nextSprintRecommendation } from "../data/mockJarvisData";

const settings = [
  { label: "Modo de datos", value: "Mixto controlado" },
  { label: "Modelo IA", value: "No conectado" },
  { label: "Exportacion JSON", value: "Planificada" },
  { label: "Tema visual", value: "Oscuro privado" },
  { label: "Backend", value: "Proyectos/Tareas protegidos" },
];

export function SettingsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Preferencias de sistema reservadas para fases posteriores, sin secretos ni variables privadas."
        eyebrow="Sistema"
        title="Ajustes"
      />

      <Card className="panel">
        <SectionHeader
          action={<Badge tone="success">Local</Badge>}
          eyebrow="Configuracion inicial"
          title="Base preparada"
        />
        <div className="settings-list">
          {settings.map((setting) => (
            <div className="settings-row" key={setting.label}>
              <span>{setting.label}</span>
              <strong>{setting.value}</strong>
            </div>
          ))}
        </div>
      </Card>

      <Card className="panel">
        <SectionHeader
          action={<Badge tone="warning">Siguiente</Badge>}
          eyebrow="Siguiente fase"
          title={nextSprintRecommendation.title}
        />
        <ul className="quiet-list">
          {nextSprintRecommendation.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </Card>

      <DemoNotice>
        Cloudflare Access protege el acceso humano al sitio. Solo Proyectos y Tareas usan datos
        reales; memoria, decisiones, personas, recordatorios, IA e integraciones siguen pendientes.
      </DemoNotice>
    </div>
  );
}
