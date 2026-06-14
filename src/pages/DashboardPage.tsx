import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";

const priorities = [
  "Definir el mapa inicial de memoria editable",
  "Cerrar el alcance visual de Sprint 1",
  "Preparar el despliegue estático en Cloudflare Pages"
];

const activeProjects = [
  { name: "JARVIS Core", status: "Base PWA", tone: "info" as const },
  { name: "Memoria personal", status: "Sprint 2", tone: "warning" as const },
  { name: "Decisiones", status: "Pendiente", tone: "neutral" as const }
];

const recentMemories = [
  "JARVIS debe abrir como centro de mando, no como chat.",
  "La memoria editable será el núcleo del producto.",
  "Sprint 1 no incluye backend ni persistencia real."
];

const recentDecisions = [
  "Usar CSS normal con variables.",
  "Evitar estado global hasta que haya datos reales.",
  "Mantener el Dashboard como primera experiencia."
];

export function DashboardPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Una primera vista para ordenar el día: prioridades, proyectos, memoria y decisiones en un solo plano."
        eyebrow="Dashboard"
        title="Centro de mando personal"
      />

      <section className="stats-grid" aria-label="Resumen inicial">
        <StatCard detail="mock" label="Prioridades" tone="warning" value="3" />
        <StatCard detail="mock" label="Proyectos activos" tone="info" value="3" />
        <StatCard detail="mock" label="Memorias recientes" tone="success" value="3" />
        <StatCard detail="mock" label="Decisiones recientes" value="3" />
      </section>

      <section className="dashboard-grid">
        <Card className="panel panel--priority" tone="accent">
          <div className="panel__header">
            <div>
              <span>Foco</span>
              <h2>Prioridades de hoy</h2>
            </div>
            <Badge tone="warning">Manual</Badge>
          </div>
          <ol className="priority-list">
            {priorities.map((priority) => (
              <li key={priority}>{priority}</li>
            ))}
          </ol>
        </Card>

        <Card className="panel">
          <div className="panel__header">
            <div>
              <span>Ejecucion</span>
              <h2>Proyectos activos</h2>
            </div>
            <Badge tone="info">Vista mock</Badge>
          </div>
          <div className="project-list">
            {activeProjects.map((project) => (
              <div className="project-row" key={project.name}>
                <span>{project.name}</span>
                <Badge tone={project.tone}>{project.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="panel">
          <div className="panel__header">
            <div>
              <span>Contexto</span>
              <h2>Memorias recientes</h2>
            </div>
            <Badge tone="success">Reactor arc</Badge>
          </div>
          <ul className="quiet-list">
            {recentMemories.map((memory) => (
              <li key={memory}>{memory}</li>
            ))}
          </ul>
        </Card>

        <Card className="panel">
          <div className="panel__header">
            <div>
              <span>Criterio</span>
              <h2>Decisiones recientes</h2>
            </div>
            <Badge>Registro</Badge>
          </div>
          <ul className="quiet-list">
            {recentDecisions.map((decision) => (
              <li key={decision}>{decision}</li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
