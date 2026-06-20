import { PageHeader } from "../components/layout/PageHeader";
import { QuickActionGrid } from "../components/dashboard/QuickActionGrid";
import { SystemStatusCard } from "../components/dashboard/SystemStatusCard";
import { MemoryCard } from "../components/memory/MemoryCard";
import { ProjectSummaryCard } from "../components/projects/ProjectSummaryCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DemoNotice } from "../components/ui/DemoNotice";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import {
  dailyFocus,
  dailyMetrics,
  jarvisRecommendation,
  memories,
  projects,
  quickActions,
  reminders,
  systemStatus,
} from "../data/mockJarvisData";

function formatToday() {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function navigateTo(route: string) {
  window.history.pushState({}, "", route);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function DashboardPage() {
  const activeProjects = projects.filter((project) => project.status !== "completed");
  const recentMemories = memories.slice(0, 4);

  return (
    <div className="page-stack command-center">
      <PageHeader
        description="Un plano operativo para leer prioridades, contexto y proximos pasos sin conectar datos reales."
        eyebrow={dailyFocus.mode}
        title={dailyFocus.greeting}
      />

      <section className="dashboard-hero-grid">
        <Card className="next-action-card" tone="accent">
          <div className="next-action-card__header">
            <div>
              <span>Siguiente mejor accion</span>
              <h2>{dailyFocus.headline}</h2>
            </div>
            <PriorityBadge priority="P0" />
          </div>
          <p>{dailyFocus.context}</p>
          <div className="next-action-card__project">
            <span>Proyecto vinculado</span>
            <strong>{dailyFocus.linkedProject}</strong>
          </div>
          <div className="action-row">
            <Button onClick={() => navigateTo("/projects")} variant="primary">
              Abrir proyecto
            </Button>
            <Button onClick={() => navigateTo("/tasks")} variant="secondary">
              Ver tareas
            </Button>
          </div>
          <small>{dailyFocus.note}</small>
        </Card>

        <SystemStatusCard status={systemStatus} />
      </section>

      <section className="today-row" aria-label="Resumen de hoy">
        <Card className="today-card">
          <SectionHeader description={formatToday()} eyebrow="Resumen de hoy" title="Lectura rapida" />
          <div className="today-card__metrics">
            {dailyMetrics.map((metric) => (
              <article className="metric-tile" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <Badge tone={metric.tone}>{metric.detail}</Badge>
              </article>
            ))}
          </div>
        </Card>
      </section>

      <section className="dashboard-grid dashboard-grid--weighted">
        <Card className="panel dashboard-grid__wide">
          <SectionHeader
            action={<Badge tone="info">{activeProjects.length} visibles</Badge>}
            description="Frentes con siguiente accion, progreso y riesgo explicito."
            eyebrow="Ejecucion"
            title="Proyectos activos"
          />
          <div className="project-card-grid">
            {activeProjects.map((project) => (
              <ProjectSummaryCard key={project.id} project={project} />
            ))}
          </div>
        </Card>

        <Card className="panel recommendation-card">
          <SectionHeader eyebrow="Futura IA" title={jarvisRecommendation.title} />
          <p>{jarvisRecommendation.text}</p>
          <DemoNotice>{jarvisRecommendation.notice}</DemoNotice>
        </Card>

        <Card className="panel dashboard-grid__wide">
          <SectionHeader
            description="Fragmentos de contexto que despues alimentaran memoria, decisiones y chat."
            eyebrow="Reactor arc"
            title="Memoria reciente"
          />
          <div className="memory-card-grid memory-card-grid--compact">
            {recentMemories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
        </Card>

        <Card className="panel">
          <SectionHeader eyebrow="Accesos rapidos" title="Operaciones visuales" />
          <QuickActionGrid actions={quickActions} />
        </Card>

        <Card className="panel">
          <SectionHeader
            action={<Badge tone="warning">Sin calendario</Badge>}
            eyebrow="Senales"
            title="Recordatorios proximos"
          />
          <div className="compact-list">
            {reminders.slice(0, 2).map((reminder) => (
              <article key={reminder.id}>
                <span>{reminder.timeLabel}</span>
                <strong>{reminder.title}</strong>
                <p>{reminder.context}</p>
              </article>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
