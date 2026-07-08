import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { QuickActionGrid } from "../components/dashboard/QuickActionGrid";
import { SystemStatusCard } from "../components/dashboard/SystemStatusCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  fetchExecutiveBriefing,
  type BriefingDecision,
  type BriefingMemoryAttention,
  type BriefingReminder,
  type BriefingTask,
  type ExecutiveBriefing,
  type MemoryAttentionReason,
  type TaskSelectionReason,
} from "../lib/api/dashboardBriefing";
import type { ArcCoreState, DailyMetric, Priority, QuickAction, SystemStatus } from "../types/jarvis";

const dashboardQuickActions: QuickAction[] = [
  {
    label: "Nueva tarea",
    description: "Abre el modulo de ejecucion diaria.",
    route: "/tasks",
  },
  {
    label: "Guardar memoria",
    description: "Abre la memoria privada.",
    route: "/memory",
  },
  {
    label: "Ver proyectos",
    description: "Revisar frentes activos.",
    route: "/projects",
  },
  {
    label: "Recordatorios",
    description: "Consultar avisos reales.",
    route: "/reminders",
  },
  {
    label: "Decisiones",
    description: "Revisar criterios abiertos.",
    route: "/decisions",
  },
  {
    label: "Abrir chat",
    description: "Ir al canal de trabajo.",
    route: "/chat",
  },
];

const selectionReasonLabels: Record<TaskSelectionReason, string> = {
  overdue: "Vencida",
  in_progress: "En curso",
  high_priority: "Alta prioridad",
  nearest_due_date: "Proxima fecha limite",
};

const memoryReasonLabels: Record<MemoryAttentionReason, string> = {
  expired: "Caducada",
  review_due: "Revision pendiente",
};

const memoryTypeLabels: Record<BriefingMemoryAttention["type"], string> = {
  personal: "Personal",
  project: "Proyecto",
  decision: "Decision",
  preference: "Preferencia",
  knowledge: "Conocimiento",
  temporal: "Temporal",
};

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

function formatDate(value: string | null): string {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return formatToday();
  }

  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function priorityForBriefing(briefing: ExecutiveBriefing): Priority {
  return (
    briefing.nextBestAction?.priority ??
    briefing.keyTasks[0]?.priority ??
    briefing.activeProjects[0]?.priority ??
    briefing.memoryAttention[0]?.priority ??
    briefing.decisions.open[0]?.priority ??
    "P4"
  );
}

function hasBriefingData(briefing: ExecutiveBriefing): boolean {
  return Boolean(
    briefing.nextBestAction ||
      briefing.keyTasks.length > 0 ||
      briefing.activeProjects.length > 0 ||
      briefing.reminders.overdue.length > 0 ||
      briefing.reminders.upcoming.length > 0 ||
      briefing.memoryAttention.length > 0 ||
      briefing.decisions.open.length > 0 ||
      briefing.decisions.recentDecided.length > 0,
  );
}

function systemStatusFromBriefing(briefing: ExecutiveBriefing): SystemStatus {
  const taskFocusCount = briefing.keyTasks.length + (briefing.nextBestAction ? 1 : 0);
  const urgentReminderCount = briefing.reminders.overdue.length;
  const hasData = hasBriefingData(briefing);
  const state: ArcCoreState = urgentReminderCount > 0 ? "blocked" : briefing.nextBestAction ? "focus" : hasData ? "active" : "calm";

  return {
    state,
    general: urgentReminderCount > 0 ? "Atencion" : briefing.nextBestAction ? "En foco" : "Estable",
    focus: briefing.nextBestAction?.title ?? "Sin accion pendiente",
    priority: priorityForBriefing(briefing),
    activity: `${taskFocusCount} tareas en foco`,
    security: "D1 privado",
    memory:
      briefing.memoryAttention.length > 0
        ? `${briefing.memoryAttention.length} requieren atencion`
        : "Sin alertas de memoria",
    note: "Lectura generada desde el briefing privado. El Dashboard no modifica datos.",
  };
}

function metricsFromBriefing(briefing: ExecutiveBriefing): DailyMetric[] {
  const taskFocusCount = briefing.keyTasks.length + (briefing.nextBestAction ? 1 : 0);
  const reminderCount = briefing.reminders.overdue.length + briefing.reminders.upcoming.length;

  return [
    { label: "Tareas en foco", value: String(taskFocusCount), detail: "briefing", tone: taskFocusCount > 0 ? "warning" : "success" },
    { label: "Proyectos activos", value: String(briefing.activeProjects.length), detail: "D1 real", tone: "info" },
    { label: "Recordatorios", value: String(reminderCount), detail: briefing.reminders.overdue.length > 0 ? "vencidos" : "proximos", tone: briefing.reminders.overdue.length > 0 ? "warning" : "success" },
    { label: "Decisiones abiertas", value: String(briefing.decisions.open.length), detail: "revision", tone: briefing.decisions.open.length > 0 ? "info" : "neutral" },
  ];
}

function sectionEmpty(message: string) {
  return <p className="dashboard-empty-note">{message}</p>;
}

function TaskBriefingItem({ task }: { task: BriefingTask }) {
  return (
    <article className="dashboard-briefing-item">
      <div className="dashboard-briefing-item__title">
        <strong>{task.title}</strong>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="dashboard-briefing-item__meta">
        <StatusBadge status={task.status} />
        <Badge tone={task.selectionReason === "overdue" ? "warning" : "info"}>
          {selectionReasonLabels[task.selectionReason]}
        </Badge>
        {task.dueAt ? <span>Fecha: {formatDate(task.dueAt)}</span> : <span>Sin fecha limite</span>}
      </div>
    </article>
  );
}

function ReminderBriefingItem({ reminder, tone }: { reminder: BriefingReminder; tone: "warning" | "info" }) {
  return (
    <article className="dashboard-briefing-item">
      <div className="dashboard-briefing-item__title">
        <strong>{reminder.title}</strong>
        <PriorityBadge priority={reminder.priority} />
      </div>
      <div className="dashboard-briefing-item__meta">
        <Badge tone={tone}>{tone === "warning" ? "Vencido" : "Proximo"}</Badge>
        <span>{formatDate(reminder.dueAt)}</span>
      </div>
    </article>
  );
}

function MemoryAttentionItem({ memory }: { memory: BriefingMemoryAttention }) {
  const expired = memory.attentionReasons.includes("expired");
  const reviewDue = memory.attentionReasons.includes("review_due");
  const className = ["memory-card", expired ? "memory-card--expired" : null, reviewDue ? "memory-card--review" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      <div className="memory-card__top">
        <span>{memoryTypeLabels[memory.type]}</span>
        <PriorityBadge priority={memory.priority} />
      </div>
      <h3>{memory.title}</h3>
      <div className="memory-card__meta">
        <StatusBadge status="active" />
        {memory.attentionReasons.map((reason) => (
          <Badge key={reason} tone="warning">
            {memoryReasonLabels[reason]}
          </Badge>
        ))}
      </div>
      <p className="text-muted">
        Caduca: {formatDate(memory.expiresAt)} - Revision: {formatDate(memory.reviewDueAt)}
      </p>
    </article>
  );
}

function DecisionBriefingItem({ decision }: { decision: BriefingDecision }) {
  return (
    <article className="dashboard-briefing-item">
      <div className="dashboard-briefing-item__title">
        <strong>{decision.title}</strong>
        <PriorityBadge priority={decision.priority} />
      </div>
      <div className="dashboard-briefing-item__meta">
        <StatusBadge status={decision.status} />
        <span>{decision.decidedAt ? `Decidida: ${formatDate(decision.decidedAt)}` : `Actualizada: ${formatDate(decision.updatedAt)}`}</span>
      </div>
    </article>
  );
}

export function DashboardPage() {
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchExecutiveBriefing();
      setBriefing(data);
    } catch {
      setError("No se pudo cargar el briefing privado. Revisa Access y vuelve a intentarlo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBriefing();
  }, [loadBriefing]);

  const metrics = useMemo(() => (briefing ? metricsFromBriefing(briefing) : []), [briefing]);
  const systemStatus = useMemo(() => (briefing ? systemStatusFromBriefing(briefing) : null), [briefing]);
  const hasData = briefing ? hasBriefingData(briefing) : false;

  if (loading && !briefing) {
    return (
      <div className="page-stack command-center">
        <PageHeader
          description="JARVIS esta leyendo el briefing privado del Dashboard."
          eyebrow="Briefing privado"
          title="Command Center"
        />
        <EmptyState
          badge="Cargando"
          description="Consultando /api/dashboard/briefing sin modificar datos."
          title="Cargando briefing ejecutivo"
        />
      </div>
    );
  }

  if (error && !briefing) {
    return (
      <div className="page-stack command-center">
        <PageHeader
          description="El Dashboard consume un unico endpoint privado y no crea datos."
          eyebrow="Briefing privado"
          title="Command Center"
        />
        <EmptyState badge="Error seguro" description={error} title="No se pudo cargar el Dashboard">
          <Button onClick={() => void loadBriefing()} variant="secondary">
            Reintentar
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!briefing || !systemStatus) {
    return null;
  }

  return (
    <div className="page-stack command-center">
      <PageHeader
        description="Plano operativo conectado al briefing privado de JARVIS."
        eyebrow="Briefing privado"
        title="Command Center"
      />

      <section className="dashboard-hero-grid">
        <Card className="next-action-card" tone="accent">
          <div className="next-action-card__header">
            <div>
              <span>Siguiente mejor accion</span>
              <h2>{briefing.nextBestAction?.title ?? "No hay una siguiente accion pendiente."}</h2>
            </div>
            {briefing.nextBestAction ? (
              <PriorityBadge priority={briefing.nextBestAction.priority} />
            ) : (
              <Badge tone="success">Al dia</Badge>
            )}
          </div>
          <p>
            {briefing.nextBestAction
              ? `${selectionReasonLabels[briefing.nextBestAction.selectionReason]} · ${formatDate(briefing.nextBestAction.dueAt)}`
              : "El briefing no encontro tareas accionables para elevar aqui."}
          </p>
          {briefing.nextBestAction ? (
            <div className="next-action-card__project">
              <span>Estado</span>
              <strong>
                <StatusBadge status={briefing.nextBestAction.status} />
              </strong>
            </div>
          ) : null}
          <div className="action-row">
            <Button onClick={() => navigateTo("/tasks")} variant="secondary">
              Ver tareas
            </Button>
            <Button onClick={() => navigateTo("/projects")} variant="ghost">
              Ver proyectos
            </Button>
          </div>
          <small>Generado: {formatGeneratedAt(briefing.generatedAt)}</small>
        </Card>

        <SystemStatusCard status={systemStatus} />
      </section>

      {!hasData ? (
        <EmptyState
          badge="Sin datos reales"
          description="El briefing privado respondio correctamente, pero todavia no hay tareas, proyectos, recordatorios, memorias o decisiones para resumir."
          title="Dashboard listo para datos reales"
        />
      ) : null}

      <section className="today-row" aria-label="Resumen de hoy">
        <Card className="today-card">
          <SectionHeader description={formatToday()} eyebrow="Resumen de hoy" title="Lectura rapida" />
          <div className="today-card__metrics">
            {metrics.map((metric) => (
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
            action={<Badge tone="info">{briefing.activeProjects.length} activos</Badge>}
            description="Frentes activos agregados desde el briefing."
            eyebrow="Ejecucion"
            title="Proyectos activos"
          />
          {briefing.activeProjects.length > 0 ? (
            <div className="project-card-grid">
              {briefing.activeProjects.map((project) => (
                <article className="project-summary-card" key={project.id}>
                  <div className="project-summary-card__top">
                    <div>
                      <h3>{project.name}</h3>
                      <p>{project.openTaskCount} tareas abiertas</p>
                    </div>
                    <PriorityBadge priority={project.priority} />
                  </div>
                  <div className="badge-row">
                    <StatusBadge status={project.status} />
                    <span>Actualizado: {formatDate(project.updatedAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            sectionEmpty("No hay proyectos activos en el briefing.")
          )}
        </Card>

        <Card className="panel">
          <SectionHeader
            action={<Badge tone="info">{briefing.keyTasks.length} claves</Badge>}
            eyebrow="Ejecucion"
            title="Tareas clave"
          />
          {briefing.keyTasks.length > 0 ? (
            <div className="dashboard-section-stack">
              {briefing.keyTasks.map((task) => (
                <TaskBriefingItem key={task.id} task={task} />
              ))}
            </div>
          ) : (
            sectionEmpty("No hay tareas clave pendientes.")
          )}
        </Card>

        <Card className="panel dashboard-grid__wide">
          <SectionHeader
            action={<Badge tone="warning">{briefing.memoryAttention.length} alertas</Badge>}
            description="Memorias activas caducadas o con revision pendiente."
            eyebrow="Reactor arc"
            title="Memoria que requiere atencion"
          />
          {briefing.memoryAttention.length > 0 ? (
            <div className="memory-card-grid memory-card-grid--compact">
              {briefing.memoryAttention.map((memory) => (
                <MemoryAttentionItem key={memory.id} memory={memory} />
              ))}
            </div>
          ) : (
            sectionEmpty("No hay memorias caducadas ni pendientes de revision.")
          )}
        </Card>

        <Card className="panel">
          <SectionHeader eyebrow="Accesos rapidos" title="Operaciones visuales" />
          <QuickActionGrid actions={dashboardQuickActions} />
        </Card>

        <Card className="panel">
          <SectionHeader
            action={<Badge tone={briefing.reminders.overdue.length > 0 ? "warning" : "info"}>{briefing.reminders.overdue.length} vencidos</Badge>}
            eyebrow="Senales"
            title="Recordatorios"
          />
          {briefing.reminders.overdue.length === 0 && briefing.reminders.upcoming.length === 0 ? (
            sectionEmpty("No hay recordatorios urgentes.")
          ) : (
            <div className="dashboard-section-stack">
              {briefing.reminders.overdue.map((reminder) => (
                <ReminderBriefingItem key={reminder.id} reminder={reminder} tone="warning" />
              ))}
              {briefing.reminders.upcoming.map((reminder) => (
                <ReminderBriefingItem key={reminder.id} reminder={reminder} tone="info" />
              ))}
            </div>
          )}
        </Card>

        <Card className="panel dashboard-grid__wide">
          <SectionHeader
            action={<Badge tone="info">{briefing.decisions.open.length} abiertas</Badge>}
            description="Decisiones abiertas y ultimas decididas desde el briefing."
            eyebrow="Criterio"
            title="Decisiones"
          />
          <div className="dashboard-dual-list">
            <section>
              <h3>Abiertas</h3>
              {briefing.decisions.open.length > 0 ? (
                <div className="dashboard-section-stack">
                  {briefing.decisions.open.map((decision) => (
                    <DecisionBriefingItem decision={decision} key={decision.id} />
                  ))}
                </div>
              ) : (
                sectionEmpty("No hay decisiones abiertas.")
              )}
            </section>
            <section>
              <h3>Ultimas decididas</h3>
              {briefing.decisions.recentDecided.length > 0 ? (
                <div className="dashboard-section-stack">
                  {briefing.decisions.recentDecided.map((decision) => (
                    <DecisionBriefingItem decision={decision} key={decision.id} />
                  ))}
                </div>
              ) : (
                sectionEmpty("No hay decisiones recientes.")
              )}
            </section>
          </div>
        </Card>
      </section>
    </div>
  );
}
