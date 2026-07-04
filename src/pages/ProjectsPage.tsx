import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  createProject,
  fetchProjects,
  updateProject,
  type ProjectPayload,
  type RealProject,
} from "../lib/api/projectsTasks";
import type { Priority, ProjectStatus } from "../types/jarvis";

const projectStatuses: ProjectStatus[] = ["active", "planning", "paused", "completed", "archived"];
const priorities: Priority[] = ["P0", "P1", "P2", "P3", "P4"];

const emptyProjectForm = {
  description: "",
  name: "",
  priority: "P2" as Priority,
  status: "active" as ProjectStatus,
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

function cleanDescription(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function upsertProject(projects: RealProject[], project: RealProject): RealProject[] {
  const exists = projects.some((item) => item.id === project.id);
  const nextProjects = exists
    ? projects.map((item) => (item.id === project.id ? project : item))
    : [project, ...projects];

  return [...nextProjects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<RealProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyProjectForm);
  const [editForm, setEditForm] = useState(emptyProjectForm);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId],
  );

  async function loadProjects() {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchProjects();
      setProjects(data);
      setSelectedProjectId((currentId) => data.find((project) => project.id === currentId)?.id ?? data[0]?.id ?? "");
    } catch {
      setError("No se pudieron cargar los proyectos reales. Revisa Access y vuelve a intentarlo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setEditForm(emptyProjectForm);
      return;
    }

    setEditForm({
      description: selectedProject.description ?? "",
      name: selectedProject.name,
      priority: selectedProject.priority,
      status: selectedProject.status,
    });
  }, [selectedProject]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const project = await createProject({
        description: cleanDescription(createForm.description),
        name: createForm.name,
        priority: createForm.priority,
        status: createForm.status,
      });
      setProjects((currentProjects) => upsertProject(currentProjects, project));
      setSelectedProjectId(project.id);
      setCreateForm(emptyProjectForm);
    } catch {
      setError("No se pudo crear el proyecto. Comprueba los campos y vuelve a intentarlo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProject) {
      return;
    }

    const payload: ProjectPayload = {
      description: cleanDescription(editForm.description),
      name: editForm.name,
      priority: editForm.priority,
      status: editForm.status,
    };

    setSaving(true);
    setError(null);

    try {
      const project = await updateProject(selectedProject.id, payload);
      setProjects((currentProjects) => upsertProject(currentProjects, project));
      setSelectedProjectId(project.id);
    } catch {
      setError("No se pudo actualizar el proyecto.");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = projects.filter((project) => project.status === "active").length;
  const completedCount = projects.filter((project) => project.status === "completed").length;

  return (
    <div className="page-stack">
      <PageHeader
        description="Proyectos reales persistidos en D1 y aislados por Cloudflare Access."
        eyebrow="D1 privado"
        title="Proyectos"
      />

      <section className="summary-strip" aria-label="Resumen de proyectos">
        <Badge tone="info">{projects.length} proyectos reales</Badge>
        <Badge tone="success">{activeCount} activos</Badge>
        <Badge>{completedCount} completados</Badge>
      </section>

      {error ? (
        <EmptyState
          badge="Error seguro"
          description={error}
          title="No se pudo completar la operacion"
        >
          <Button onClick={() => void loadProjects()} variant="secondary">
            Reintentar
          </Button>
        </EmptyState>
      ) : null}

      <Card className="panel">
        <SectionHeader
          description="Solo se guardan nombre, descripcion, estado y prioridad. No hay progreso, riesgo ni memoria vinculada todavia."
          title="Crear proyecto"
        />
        <form className="data-form" onSubmit={handleCreateProject}>
          <label>
            Nombre
            <input
              maxLength={120}
              onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))}
              required
              value={createForm.name}
            />
          </label>
          <label>
            Descripcion
            <textarea
              maxLength={800}
              onChange={(event) => setCreateForm((form) => ({ ...form, description: event.target.value }))}
              rows={3}
              value={createForm.description}
            />
          </label>
          <div className="data-form__row">
            <label>
              Estado
              <select
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, status: event.target.value as ProjectStatus }))
                }
                value={createForm.status}
              >
                {projectStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioridad
              <select
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, priority: event.target.value as Priority }))
                }
                value={createForm.priority}
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button disabled={saving} type="submit" variant="primary">
            Crear proyecto
          </Button>
        </form>
      </Card>

      {loading ? (
        <EmptyState
          badge="Cargando"
          description="JARVIS esta leyendo proyectos reales desde D1."
          title="Cargando proyectos"
        />
      ) : projects.length === 0 ? (
        <EmptyState
          badge="Sin datos reales"
          description="Aun no hay proyectos creados para esta identidad de Cloudflare Access."
          title="Crea el primer proyecto"
        />
      ) : (
        <section className="project-workspace">
          <div className="project-selector">
            {projects.map((project) => (
              <button
                aria-pressed={selectedProject?.id === project.id}
                className={
                  selectedProject?.id === project.id
                    ? "project-summary-card project-summary-card--selected"
                    : "project-summary-card"
                }
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                type="button"
              >
                <div className="project-summary-card__top">
                  <div>
                    <h3>{project.name}</h3>
                    <p>{project.description ?? "Sin descripcion"}</p>
                  </div>
                  <PriorityBadge priority={project.priority} />
                </div>
                <div className="badge-row">
                  <StatusBadge status={project.status} />
                  <span>{formatDate(project.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedProject ? (
            <Card className="project-detail-panel">
              <SectionHeader
                action={<PriorityBadge priority={selectedProject.priority} />}
                description={selectedProject.description ?? "Proyecto real sin descripcion adicional."}
                eyebrow="Detalle real"
                title={selectedProject.name}
              />
              <div className="badge-row">
                <StatusBadge status={selectedProject.status} />
                <span>Actualizado: {formatDate(selectedProject.updatedAt)}</span>
                <span>Creado: {formatDate(selectedProject.createdAt)}</span>
              </div>
              <form className="data-form" onSubmit={handleUpdateProject}>
                <label>
                  Nombre
                  <input
                    maxLength={120}
                    onChange={(event) => setEditForm((form) => ({ ...form, name: event.target.value }))}
                    required
                    value={editForm.name}
                  />
                </label>
                <label>
                  Descripcion
                  <textarea
                    maxLength={800}
                    onChange={(event) => setEditForm((form) => ({ ...form, description: event.target.value }))}
                    rows={4}
                    value={editForm.description}
                  />
                </label>
                <div className="data-form__row">
                  <label>
                    Estado
                    <select
                      onChange={(event) =>
                        setEditForm((form) => ({ ...form, status: event.target.value as ProjectStatus }))
                      }
                      value={editForm.status}
                    >
                      {projectStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Prioridad
                    <select
                      onChange={(event) =>
                        setEditForm((form) => ({ ...form, priority: event.target.value as Priority }))
                      }
                      value={editForm.priority}
                    >
                      {priorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Button disabled={saving} type="submit" variant="primary">
                  Guardar cambios
                </Button>
              </form>
            </Card>
          ) : null}
        </section>
      )}
    </div>
  );
}
