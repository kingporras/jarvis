import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterChipGroup } from "../components/ui/FilterChipGroup";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  createTask,
  fetchProjects,
  fetchTasks,
  updateTask,
  type RealProject,
  type RealTask,
  type TaskPayload,
} from "../lib/api/projectsTasks";
import type { Priority, TaskStatus } from "../types/jarvis";

type TaskFilter = "all" | TaskStatus;

const taskStatuses: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];
const priorities: Priority[] = ["P0", "P1", "P2", "P3", "P4"];

const emptyTaskForm = {
  dueAt: "",
  notes: "",
  priority: "P2" as Priority,
  projectId: "",
  status: "todo" as TaskStatus,
  title: "",
};

function formatDate(value: string | null): string {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function cleanNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function dateInputValue(value: string | null): string {
  return value?.slice(0, 10) ?? "";
}

function upsertTask(tasks: RealTask[], task: RealTask): RealTask[] {
  const exists = tasks.some((item) => item.id === task.id);
  const nextTasks = exists ? tasks.map((item) => (item.id === task.id ? task : item)) : [task, ...tasks];

  return [...nextTasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}

export function TasksPage() {
  const [tasks, setTasks] = useState<RealTask[]>([]);
  const [projects, setProjects] = useState<RealProject[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTaskForm);

  const visibleTasks = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((task) => task.status === filter)),
    [filter, tasks],
  );

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [projectData, taskData] = await Promise.all([fetchProjects(), fetchTasks()]);
      setProjects(projectData);
      setTasks(taskData);
    } catch {
      setError("No se pudieron cargar las tareas reales. Revisa Access y vuelve a intentarlo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const task = await createTask({
        dueAt: cleanNullable(form.dueAt),
        notes: cleanNullable(form.notes),
        priority: form.priority,
        projectId: cleanNullable(form.projectId),
        status: form.status,
        title: form.title,
      });
      setTasks((currentTasks) => upsertTask(currentTasks, task));
      setForm(emptyTaskForm);
    } catch {
      setError("No se pudo crear la tarea. Comprueba los campos y vuelve a intentarlo.");
    } finally {
      setSaving(false);
    }
  }

  async function patchTask(task: RealTask, payload: TaskPayload) {
    setSaving(true);
    setError(null);

    try {
      const updated = await updateTask(task.id, payload);
      setTasks((currentTasks) => upsertTask(currentTasks, updated));
    } catch {
      setError("No se pudo actualizar la tarea.");
    } finally {
      setSaving(false);
    }
  }

  const openCount = tasks.filter((task) => task.status !== "done").length;
  const doneCount = tasks.filter((task) => task.status === "done").length;

  return (
    <div className="page-stack">
      <PageHeader
        description="Tareas reales persistidas en D1, protegidas por Cloudflare Access y aisladas por identidad."
        eyebrow="D1 privado"
        title="Tareas"
      />

      <section className="summary-strip" aria-label="Resumen de tareas">
        <Badge tone="info">{tasks.length} tareas reales</Badge>
        <Badge tone="warning">{openCount} abiertas</Badge>
        <Badge tone="success">{doneCount} completadas</Badge>
      </section>

      {error ? (
        <EmptyState badge="Error seguro" description={error} title="No se pudo completar la operacion">
          <Button onClick={() => void loadData()} variant="secondary">
            Reintentar
          </Button>
        </EmptyState>
      ) : null}

      <Card className="panel">
        <SectionHeader
          description="Puedes vincular una tarea a un proyecto propio o dejarla sin proyecto."
          title="Crear tarea"
        />
        <form className="data-form" onSubmit={handleCreateTask}>
          <label>
            Titulo
            <input
              maxLength={160}
              onChange={(event) => setForm((draft) => ({ ...draft, title: event.target.value }))}
              required
              value={form.title}
            />
          </label>
          <label>
            Notas
            <textarea
              maxLength={1000}
              onChange={(event) => setForm((draft) => ({ ...draft, notes: event.target.value }))}
              rows={3}
              value={form.notes}
            />
          </label>
          <div className="data-form__row data-form__row--triple">
            <label>
              Estado
              <select
                onChange={(event) => setForm((draft) => ({ ...draft, status: event.target.value as TaskStatus }))}
                value={form.status}
              >
                {taskStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioridad
              <select
                onChange={(event) => setForm((draft) => ({ ...draft, priority: event.target.value as Priority }))}
                value={form.priority}
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fecha limite
              <input
                onChange={(event) => setForm((draft) => ({ ...draft, dueAt: event.target.value }))}
                type="date"
                value={form.dueAt}
              />
            </label>
          </div>
          <label>
            Proyecto
            <select
              onChange={(event) => setForm((draft) => ({ ...draft, projectId: event.target.value }))}
              value={form.projectId}
            >
              <option value="">Sin proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={saving} type="submit" variant="primary">
            Crear tarea
          </Button>
        </form>
      </Card>

      <FilterChipGroup
        label="Vista"
        onChange={setFilter}
        options={[
          { label: "Todas", value: "all" },
          { label: "Por hacer", value: "todo" },
          { label: "En curso", value: "in_progress" },
          { label: "Bloqueadas", value: "blocked" },
          { label: "Completadas", value: "done" },
        ]}
        value={filter}
      />

      <SectionHeader
        action={<Badge tone="info">{visibleTasks.length} visibles</Badge>}
        description="La lista muestra solo tareas reales de la identidad validada por Access."
        title="Cola de ejecucion"
      />

      {loading ? (
        <EmptyState
          badge="Cargando"
          description="JARVIS esta leyendo tareas reales desde D1."
          title="Cargando tareas"
        />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          badge="Sin datos reales"
          description="No hay tareas en esta vista. Crea una tarea para empezar a persistir ejecucion real."
          title="No hay tareas todavia"
        />
      ) : (
        <section className="task-list">
          {visibleTasks.map((task) => (
            <article
              className={task.priority === "P0" || task.priority === "P1" ? "task-row task-row--urgent" : "task-row"}
              key={task.id}
            >
              <div>
                <h3>{task.title}</h3>
                <p>{task.notes ?? "Sin notas adicionales."}</p>
                <div className="badge-row">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                  <span>{task.projectName ?? "Sin proyecto"}</span>
                  <strong>{formatDate(task.dueAt)}</strong>
                </div>
              </div>
              <div className="task-row__controls">
                <label>
                  Estado
                  <select
                    disabled={saving}
                    onChange={(event) => void patchTask(task, { status: event.target.value as TaskStatus })}
                    value={task.status}
                  >
                    {taskStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Prioridad
                  <select
                    disabled={saving}
                    onChange={(event) => void patchTask(task, { priority: event.target.value as Priority })}
                    value={task.priority}
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Proyecto
                  <select
                    disabled={saving}
                    onChange={(event) =>
                      void patchTask(task, { projectId: event.target.value.trim() || null })
                    }
                    value={task.projectId ?? ""}
                  >
                    <option value="">Sin proyecto</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fecha
                  <input
                    disabled={saving}
                    onChange={(event) => void patchTask(task, { dueAt: event.target.value || null })}
                    type="date"
                    value={dateInputValue(task.dueAt)}
                  />
                </label>
                <Button
                  disabled={saving}
                  onClick={() => void patchTask(task, { status: task.status === "done" ? "todo" : "done" })}
                  variant={task.status === "done" ? "secondary" : "primary"}
                >
                  {task.status === "done" ? "Reabrir" : "Completar"}
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
