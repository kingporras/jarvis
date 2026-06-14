import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

const reminderIdeas = [
  "Revisar prioridades al empezar el día.",
  "Cerrar decisiones abiertas al final de la semana.",
  "Actualizar memoria tras hitos importantes."
];

export function RemindersPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Recordatorios simples previstos para evolucionar con backend. No hay notificaciones reales todavía."
        eyebrow="Señales"
        title="Recordatorios"
      />

      <Card className="panel">
        <div className="panel__header">
          <div>
            <span>Borrador</span>
            <h2>Recordatorios simples</h2>
          </div>
          <Badge tone="warning">No programado</Badge>
        </div>
        <ul className="quiet-list">
          {reminderIdeas.map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
      </Card>

      <EmptyState
        badge="Sin automatizaciones"
        description="Sprint 1 no envía avisos, no crea jobs y no programa tareas en servicios externos."
        title="Motor de avisos pendiente"
      />
    </div>
  );
}
