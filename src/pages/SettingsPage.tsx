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
  { label: "Exportacion JSON", value: "Disponible", tone: "success" as const },
  { label: "IA", value: "No conectada", tone: "neutral" as const },
  { label: "Voz", value: "No conectada", tone: "neutral" as const },
];

const activeModules = [
  "Proyectos",
  "Tareas",
  "Memoria",
  "Decisiones",
  "Personas",
  "Recordatorios",
  "Dashboard briefing",
];

const pendingCapabilities = [
  "Chat contextual",
  "IA privada",
  "RAG",
  "Vectorize",
  "Workers AI",
  "Voz",
  "Importacion JSON",
  "Backups automaticos",
];

const localNodes = [
  { label: "JANUS/Raspberry", value: "Aislado, sin sync cloud" },
  { label: "Lenovo local", value: "Aislado, sin sync cloud" },
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
        description="Estado actual del sistema privado y exportacion local de datos."
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
          eyebrow="Capacidades"
          title="No conectadas todavia"
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
          Incluye proyectos, tareas, memoria, enlaces de memoria, decisiones, personas y recordatorios del usuario autenticado.
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
        <SectionHeader eyebrow="Nodos locales" title="Aislamiento actual" />
        <div className="settings-list">
          {localNodes.map((node) => (
            <div className="settings-row" key={node.label}>
              <span>{node.label}</span>
              <strong>{node.value}</strong>
            </div>
          ))}
        </div>
      </Card>

      <Card className="panel">
        <SectionHeader
          action={<Badge tone="info">Proxima fase</Badge>}
          eyebrow="Roadmap"
          title="Chat contextual"
        />
        <p className="settings-copy">
          La siguiente fase natural es conectar el Chat a contexto real sin activar IA autonoma, voz ni sincronizacion externa.
        </p>
      </Card>
    </div>
  );
}
