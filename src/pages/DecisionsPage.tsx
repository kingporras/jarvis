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
  createDecision,
  fetchDecisions,
  updateDecision,
  type DecisionPayload,
  type RealDecision,
  type RealDecisionStatus,
} from "../lib/api/decisions";
import { fetchProjects, type RealProject } from "../lib/api/projectsTasks";
import type { Priority } from "../types/jarvis";

type StatusFilter = "all" | RealDecisionStatus;
type PriorityFilter = "all" | Priority;
type ProjectFilter = "all" | string;
type FormMode = "create" | "edit";

const decisionStatuses: RealDecisionStatus[] = ["open", "decided", "superseded", "archived"];
const priorities: Priority[] = ["P0", "P1", "P2", "P3", "P4"];

const statusLabels: Record<RealDecisionStatus, string> = {
  archived: "Archivada",
  decided: "Decidida",
  open: "Abierta",
  superseded: "Sustituida",
};

const emptyDecisionForm = {
  context: "",
  outcome: "",
  priority: "P2" as Priority,
  projectId: "",
  rationale: "",
  status: "open" as RealDecisionStatus,
  title: "",
};

function cleanText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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

function upsertDecision(decisions: RealDecision[], decision: RealDecision): RealDecision[] {
  const exists = decisions.some((item) => item.id === decision.id);
  const nextDecisions = exists
    ? decisions.map((item) => (item.id === decision.id ? decision : item))
    : [decision, ...decisions];

  return [...nextDecisions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}

function projectName(projects: RealProject[], projectId: string | null): string {
  if (!projectId) {
    return "Sin proyecto";
  }

  return projects.find((project) => project.id === projectId)?.name ?? "Proyecto no disponible";
}

export function DecisionsPage() {
  const [decisions, setDecisions] = useState<RealDecision[]>([]);
  const [projects, setProjects] = useState<RealProject[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDecisionForm);

  const visibleDecisions = useMemo(
    () =>
      decisions.filter(
        (decision) =>
          (statusFilter === "all" || decision.status === statusFilter) &&
          (priorityFilter === "all" || decision.priority === priorityFilter) &&
          (projectFilter === "all" || decision.projectId === projectFilter),
      ),
    [decisions, priorityFilter, projectFilter, statusFilter],
  );

  async function loadDecisionData() {
    setLoading(true);
    setError(null);

    try {
      const [decisionData, projectData] = await Promise.all([
        fetchDecisions({
          priority: priorityFilter === "all" ? undefined : priorityFilter,
          projectId: projectFilter === "all" ? undefined : projectFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
        }),
        fetchProjects(),
      ]);

      setDecisions(decisionData);
      setProjects(projectData);
    } catch {
      setError("No se pudieron cargar las decisiones reales. Revisa Access y vuelve a intentarlo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDecisionData();
  }, [priorityFilter, projectFilter, statusFilter]);

  function openCreateForm() {
    setForm(emptyDecisionForm);
    setEditingDecisionId(null);
    setFormMode("create");
  }

  function openEditForm(decision: RealDecision) {
    setForm({
      context: decision.context ?? "",
      outcome: decision.outcome ?? "",
      priority: decision.priority,
      projectId: decision.projectId ?? "",
      rationale: decision.rationale ?? "",
      status: decision.status,
      title: decision.title,
    });
    setEditingDecisionId(decision.id);
    setFormMode("edit");
  }

  function closeForm() {
    setForm(emptyDecisionForm);
    setEditingDecisionId(null);
    setFormMode(null);
  }

  function decisionPayload(): Required<Pick<DecisionPayload, "title" | "status" | "priority">> & DecisionPayload {
    return {
      context: cleanText(form.context),
      outcome: cleanText(form.outcome),
      priority: form.priority,
      projectId: form.projectId || null,
      rationale: cleanText(form.rationale),
      status: form.status,
      title: form.title,
    };
  }

  async function handleSubmitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const isEditing = formMode === "edit" && Boolean(editingDecisionId);
      const payload = decisionPayload();
      const decision =
        isEditing && editingDecisionId ? await updateDecision(editingDecisionId, payload) : await createDecision(payload);

      if (!isEditing) {
        setStatusFilter("all");
        setPriorityFilter("all");
        setProjectFilter("all");
      }

      setDecisions((currentDecisions) => upsertDecision(currentDecisions, decision));
      closeForm();
    } catch {
      setError("No se pudo guardar la decision. Comprueba campos y proyecto vinculado.");
    } finally {
      setSaving(false);
    }
  }

  async function updateDecisionStatus(decision: RealDecision, status: RealDecisionStatus) {
    setSaving(true);
    setError(null);

    try {
      const updated = await updateDecision(decision.id, { status });
      setDecisions((currentDecisions) => upsertDecision(currentDecisions, updated));
    } catch {
      setError("No se pudo actualizar el estado de la decision.");
    } finally {
      setSaving(false);
    }
  }

  const openCount = decisions.filter((decision) => decision.status === "open").length;
  const decidedCount = decisions.filter((decision) => decision.status === "decided").length;

  return (
    <div className="page-stack">
      <PageHeader
        description="Decisiones reales persistidas en D1, protegidas por Cloudflare Access y aisladas por identidad."
        eyebrow="D1 privado"
        title="Decisiones"
      />

      <section className="summary-strip" aria-label="Resumen de decisiones">
        <Badge tone="info">{decisions.length} decisiones reales</Badge>
        <Badge tone="warning">{openCount} abiertas</Badge>
        <Badge tone="success">{decidedCount} decididas</Badge>
      </section>

      <section className="filter-grid" aria-label="Filtros de decisiones">
        <FilterChipGroup
          label="Estado"
          onChange={setStatusFilter}
          options={[
            { label: "Todas", value: "all" },
            { label: "Abiertas", value: "open" },
            { label: "Decididas", value: "decided" },
            { label: "Sustituidas", value: "superseded" },
            { label: "Archivadas", value: "archived" },
          ]}
          value={statusFilter}
        />
        <FilterChipGroup
          label="Prioridad"
          onChange={setPriorityFilter}
          options={[
            { label: "Todas", value: "all" },
            ...priorities.map((priority) => ({ label: priority, value: priority })),
          ]}
          value={priorityFilter}
        />
        <label className="decision-project-filter">
          Proyecto
          <select onChange={(event) => setProjectFilter(event.target.value)} value={projectFilter}>
            <option value="all">Todos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? (
        <EmptyState badge="Error seguro" description={error} title="No se pudo completar la operacion">
          <Button onClick={() => void loadDecisionData()} variant="secondary">
            Reintentar
          </Button>
        </EmptyState>
      ) : null}

      <SectionHeader
        action={
          <Button onClick={openCreateForm} variant="primary">
            Nueva decision
          </Button>
        }
        description="Las decisiones archivadas solo aparecen al elegir ese filtro. No hay borrado fisico."
        title="Criterio reutilizable"
      />

      {formMode ? (
        <Card className="panel decision-form-panel">
          <SectionHeader
            description="El ownership, timestamps y fechas de decision se calculan en servidor."
            title={formMode === "edit" ? "Editar decision" : "Nueva decision"}
          />
          <form className="data-form" onSubmit={handleSubmitDecision}>
            <label>
              Titulo
              <input
                maxLength={180}
                onChange={(event) => setForm((draft) => ({ ...draft, title: event.target.value }))}
                required
                value={form.title}
              />
            </label>
            <label>
              Contexto
              <textarea
                maxLength={2000}
                onChange={(event) => setForm((draft) => ({ ...draft, context: event.target.value }))}
                rows={3}
                value={form.context}
              />
            </label>
            <label>
              Resultado
              <textarea
                maxLength={2000}
                onChange={(event) => setForm((draft) => ({ ...draft, outcome: event.target.value }))}
                rows={3}
                value={form.outcome}
              />
            </label>
            <label>
              Motivo
              <textarea
                maxLength={3000}
                onChange={(event) => setForm((draft) => ({ ...draft, rationale: event.target.value }))}
                rows={3}
                value={form.rationale}
              />
            </label>
            <div className="data-form__row data-form__row--triple">
              <label>
                Estado
                <select
                  onChange={(event) =>
                    setForm((draft) => ({ ...draft, status: event.target.value as RealDecisionStatus }))
                  }
                  value={form.status}
                >
                  {decisionStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
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
                Proyecto
                <select
                  onChange={(event) => setForm((draft) => ({ ...draft, projectId: event.target.value }))}
                  value={form.projectId}
                >
                  <option value="">
                    {projects.length === 0 ? "Sin proyectos reales, guardar sin proyecto" : "Sin proyecto"}
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="memory-form-actions">
              <Button disabled={saving} type="submit" variant="primary">
                {formMode === "edit" ? "Guardar cambios" : "Crear decision"}
              </Button>
              <Button disabled={saving} onClick={closeForm} type="button" variant="ghost">
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {loading ? (
        <EmptyState
          badge="Cargando"
          description="JARVIS esta leyendo decisiones reales desde D1."
          title="Cargando decisiones"
        />
      ) : visibleDecisions.length === 0 ? (
        <EmptyState
          badge="Sin datos reales"
          description="No hay decisiones reales en esta vista. Crea una decision para persistir criterio."
          title="No hay decisiones todavia"
        >
          <Button onClick={openCreateForm} variant="secondary">
            Nueva decision
          </Button>
        </EmptyState>
      ) : (
        <section className="decision-list">
          {visibleDecisions.map((decision) => (
            <Card className="decision-row decision-row--real" key={decision.id}>
              <div className="decision-row__title">
                <div>
                  <h3>{decision.title}</h3>
                  <p>{decision.context ?? "Sin contexto adicional."}</p>
                </div>
                <PriorityBadge priority={decision.priority} />
              </div>
              <div className="decision-row__grid">
                <span>
                  Estado
                  <StatusBadge status={decision.status} />
                </span>
                <span>
                  Proyecto
                  <strong>{decision.projectName ?? projectName(projects, decision.projectId)}</strong>
                </span>
                <span>
                  Decidida
                  <strong>{formatDate(decision.decidedAt)}</strong>
                </span>
                <span>
                  Actualizada
                  <strong>{formatDate(decision.updatedAt)}</strong>
                </span>
              </div>
              {decision.outcome ? (
                <div className="decision-row__note">
                  <span>Resultado</span>
                  <p>{decision.outcome}</p>
                </div>
              ) : null}
              {decision.rationale ? (
                <div className="decision-row__note">
                  <span>Motivo</span>
                  <p>{decision.rationale}</p>
                </div>
              ) : null}
              <div className="decision-row__actions">
                <Button disabled={saving} onClick={() => openEditForm(decision)} variant="secondary">
                  Editar
                </Button>
                {decision.status !== "decided" && decision.status !== "archived" ? (
                  <Button
                    disabled={saving}
                    onClick={() => void updateDecisionStatus(decision, "decided")}
                    variant="primary"
                  >
                    Marcar como decidida
                  </Button>
                ) : null}
                {decision.status !== "superseded" && decision.status !== "archived" ? (
                  <Button
                    disabled={saving}
                    onClick={() => void updateDecisionStatus(decision, "superseded")}
                    variant="secondary"
                  >
                    Marcar como sustituida
                  </Button>
                ) : null}
                <Button
                  disabled={saving}
                  onClick={() =>
                    void updateDecisionStatus(decision, decision.status === "archived" ? "open" : "archived")
                  }
                  variant="ghost"
                >
                  {decision.status === "archived" ? "Reactivar" : "Archivar"}
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
