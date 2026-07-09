import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { fetchJarvisJsonExport } from "../lib/api/jsonExport";

const systemStatus = [
  { label: "Acceso humano", value: "Cloudflare Access", tone: "success" as const },
  { label: "Base de datos", value: "Cloudflare D1", tone: "success" as const },
  { label: "OpenAI", value: "Backend privado", tone: "success" as const },
  { label: "Acciones", value: "Aprobacion humana", tone: "success" as const },
  { label: "Auditoria", value: "action_executions", tone: "success" as const },
  { label: "Exportacion JSON", value: "Disponible", tone: "success" as const },
];

const activeModules = [
  "Proyectos",
  "Tareas",
  "Memoria",
  "Decisiones",
  "Personas",
  "Recordatorios",
  "Dashboard briefing",
  "Chat contextual con OpenAI",
  "Propuestas de accion",
  "Ejecucion aprobada",
  "Historial de acciones",
  "Exportacion JSON",
];

const pendingCapabilities = [
  "Importacion Obsidian",
  "JANUS/Raspberry sync",
  "Lenovo local sync",
  "Voz",
  "Email/Calendar",
  "RAG/Vectorize",
  "Automatizaciones avanzadas",
  "Historial persistente de conversaciones",
];

const securityStatus = [
  "Cloudflare Access para acceso humano",
  "Cloudflare D1 como base de datos privada",
  "OpenAI API solo desde backend",
  "Acciones solo con aprobacion humana explicita",
  "Auditoria en action_executions",
  "Sin uso de ChatGPT Plus como API",
  "Sin cookies personales",
  "Sin credenciales Cloud en JANUS/Lenovo",
];

function exportFileName(exportedAt: string): string {
  const date = new Date(exportedAt);
  const day = Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  return `jarvis-export-${day}.json`;
}

function downloadJsonFile(fileName: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  async function handleExportJson() {
    setExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const payload = await fetchJarvisJsonExport();
      const fileName = exportFileName(payload.exportedAt);

      downloadJsonFile(fileName, payload);
      setExportSuccess(`Exportado: ${fileName}`);
    } catch {
      setExportError("No se pudo exportar JSON. Revisa Access y vuelve a intentarlo.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Estado real de JARVIS v1, seguridad y exportacion local de datos."
        eyebrow="Sistema"
        title="Ajustes"
      />

      <Card className="panel">
        <SectionHeader
          action={<Badge tone="success">Privado</Badge>}
          eyebrow="Estado del sistema"
          title="JARVIS operativo"
        />
        <div className="settings-list">
          {systemStatus.map((setting) => (
            <div className="settings-row" key={setting.label}>
              <span>{setting.label}</span>
              <Badge tone={setting.tone}>{setting.value}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="panel">
        <SectionHeader
          action={<Badge tone="success">Privado</Badge>}
          eyebrow="Seguridad"
          title="Controles activos"
        />
        <div className="summary-strip">
          {securityStatus.map((control) => (
            <Badge key={control} tone="info">
              {control}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="panel">
        <SectionHeader
          action={<Badge tone="info">{activeModules.length} activos</Badge>}
          eyebrow="D1 real"
          title="Modulos activos"
        />
        <div className="summary-strip">
          {activeModules.map((module) => (
            <Badge key={module} tone="success">
              {module}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="panel">
        <SectionHeader
          action={<Badge tone="warning">Pendiente</Badge>}
          eyebrow="v1.5+"
          title="Capacidades futuras"
        />
        <div className="summary-strip">
          {pendingCapabilities.map((capability) => (
            <Badge key={capability}>{capability}</Badge>
          ))}
        </div>
      </Card>

      <Card className="panel">
        <SectionHeader
          action={<Badge tone="success">JSON</Badge>}
          eyebrow="Exportacion de datos"
          title="Copia privada local"
        />
        <p className="settings-copy">
          Incluye proyectos, tareas, memoria, enlaces de memoria, decisiones, personas, recordatorios y auditoria segura de acciones del usuario autenticado.
        </p>
        <div className="settings-actions">
          <Button disabled={exporting} onClick={() => void handleExportJson()} variant="primary">
            {exporting ? "Exportando..." : "Exportar JSON"}
          </Button>
          <span className="text-muted">No se guarda en D1, R2, KV ni disco del servidor.</span>
        </div>
        {exportError ? (
          <p className="settings-feedback settings-feedback--error" role="alert">
            {exportError}
          </p>
        ) : null}
        {exportSuccess ? (
          <p className="settings-feedback" role="status">
            {exportSuccess}
          </p>
        ) : null}
      </Card>

      <Card className="panel">
        <SectionHeader action={<Badge tone="info">v1 cerrada</Badge>} eyebrow="Roadmap" title="Siguiente ciclo" />
        <p className="settings-copy">
          JARVIS v1 queda centrado en datos privados, Chat contextual, aprobacion humana y auditoria. Las integraciones externas y automatizaciones quedan fuera de v1.
        </p>
      </Card>
    </div>
  );
}
