import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

const projectRows = [
  { area: "JARVIS Core", next: "Cerrar chasis frontend", state: "En curso" },
  { area: "Backend mínimo", next: "Workers + D1 en Sprint 2", state: "Planificado" },
  { area: "Memoria", next: "Modelo de datos inicial", state: "Pendiente" }
];

export function ProjectsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Vista placeholder para orientar frentes activos, estados y próximos resultados."
        eyebrow="Frentes activos"
        title="Proyectos"
      />

      <Card className="panel">
        <div className="panel__header">
          <div>
            <span>Mapa manual</span>
            <h2>Gestión de proyectos</h2>
          </div>
          <Badge tone="info">Mock local</Badge>
        </div>
        <div className="data-table" role="table" aria-label="Proyectos de ejemplo">
          <div className="data-table__row data-table__row--head" role="row">
            <span role="columnheader">Proyecto</span>
            <span role="columnheader">Siguiente resultado</span>
            <span role="columnheader">Estado</span>
          </div>
          {projectRows.map((row) => (
            <div className="data-table__row" role="row" key={row.area}>
              <span role="cell">{row.area}</span>
              <span role="cell">{row.next}</span>
              <span role="cell">{row.state}</span>
            </div>
          ))}
        </div>
      </Card>

      <EmptyState
        badge="Futuro CRUD"
        description="Cuando exista backend, esta sección podrá crear, actualizar y cerrar proyectos reales."
        title="Gestión real pendiente"
      />
    </div>
  );
}
