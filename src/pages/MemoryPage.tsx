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
import { fetchProjects, fetchTasks, type RealProject, type RealTask } from "../lib/api/projectsTasks";
import {
  createMemory,
  createMemoryLink,
  deleteMemoryLink,
  fetchMemories,
  fetchMemoryLinks,
  reviewMemory,
  updateMemory,
  type MemoryLink,
  type MemoryLinkTargetType,
  type MemoryPayload,
  type RealMemory,
  type RealMemoryStatus,
  type RealMemoryType,
} from "../lib/api/memory";
import type { Priority } from "../types/jarvis";

type TypeFilter = "all" | RealMemoryType;
type PriorityFilter = "all" | Priority;
type FormMode = "create" | "edit";

interface LinkDraft {
  targetId: string;
  targetType: MemoryLinkTargetType;
}

interface LinkTargetOption {
  id: string;
  label: string;
  status: string | null;
}

const memoryTypes: RealMemoryType[] = [
  "personal",
  "preference",
  "project",
  "decision",
  "task_context",
  "person",
  "knowledge",
  "system",
];
const priorities: Priority[] = ["P0", "P1", "P2", "P3", "P4"];
const mediumConfidence = 0.66;

const typeLabels: Record<RealMemoryType, string> = {
  personal: "Personal",
  preference: "Preferencia",
  project: "Proyecto",
  decision: "Decision",
  task_context: "Contexto de tarea",
  person: "Persona",
  knowledge: "Conocimiento",
  system: "Sistema",
};

const emptyMemoryForm = {
  content: "",
  expiresAt: "",
  priority: "P2" as Priority,
  reviewDueAt: "",
  title: "",
  type: "knowledge" as RealMemoryType,
};

function todayInputValue(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputValue(value: string | null): string {
  return value?.slice(0, 10) ?? "";
}

function nullableDate(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isExpired(memory: RealMemory): boolean {
  return Boolean(memory.expiresAt) && dateInputValue(memory.expiresAt) < todayInputValue();
}

function isReviewDue(memory: RealMemory): boolean {
  return Boolean(memory.reviewDueAt) && dateInputValue(memory.reviewDueAt) < todayInputValue();
}

function upsertMemory(memories: RealMemory[], memory: RealMemory): RealMemory[] {
  const exists = memories.some((item) => item.id === memory.id);
  const nextMemories = exists
    ? memories.map((item) => (item.id === memory.id ? memory : item))
    : [memory, ...memories];

  return [...nextMemories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}

function matchesFilters(
  memory: RealMemory,
  statusFilter: RealMemoryStatus,
  typeFilter: TypeFilter,
  priorityFilter: PriorityFilter,
): boolean {
  const statusMatches = memory.status === statusFilter;
  const typeMatches = typeFilter === "all" || memory.type === typeFilter;
  const priorityMatches = priorityFilter === "all" || memory.priority === priorityFilter;
  return statusMatches && typeMatches && priorityMatches;
}

function formDataText(data: FormData, field: string, fallback: string): string {
  const value = data.get(field);
  return typeof value === "string" ? value : fallback;
}

function projectOptions(projects: RealProject[]): LinkTargetOption[] {
  return projects.map((project) => ({
    id: project.id,
    label: project.name,
    status: project.status,
  }));
}

function taskOptions(tasks: RealTask[]): LinkTargetOption[] {
  return tasks.map((task) => ({
    id: task.id,
    label: task.title,
    status: task.status,
  }));
}

function linkedTargetIds(links: MemoryLink[], targetType: MemoryLinkTargetType): Set<string> {
  return new Set(links.filter((link) => link.targetType === targetType).map((link) => link.targetId));
}

function defaultLinkDraft(): LinkDraft {
  return { targetId: "", targetType: "project" };
}

function targetLabel(targetType: MemoryLinkTargetType): string {
  return targetType === "project" ? "proyecto" : "tarea";
}

function targetLabelWithArticle(targetType: MemoryLinkTargetType): string {
  return targetType === "project" ? "un proyecto" : "una tarea";
}

function targetPluralLabel(targetType: MemoryLinkTargetType): string {
  return targetType === "project" ? "proyectos" : "tareas";
}

function allTargetsLinkedMessage(targetType: MemoryLinkTargetType): string {
  return targetType === "project"
    ? "Todos los proyectos disponibles ya estan enlazados."
    : "Todas las tareas disponibles ya estan enlazadas.";
}

function memoryCardClassName(expired: boolean, reviewDue: boolean): string {
  return ["memory-card", expired ? "memory-card--expired" : null, reviewDue ? "memory-card--review" : null]
    .filter(Boolean)
    .join(" ");
}

export function MemoryPage() {
  const [memories, setMemories] = useState<RealMemory[]>([]);
  const [projects, setProjects] = useState<RealProject[]>([]);
  const [tasks, setTasks] = useState<RealTask[]>([]);
  const [linksByMemoryId, setLinksByMemoryId] = useState<Record<string, MemoryLink[]>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<string, LinkDraft>>({});
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<RealMemoryStatus>("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyMemoryForm);

  const visibleMemories = useMemo(
    () => memories.filter((memory) => matchesFilters(memory, statusFilter, typeFilter, priorityFilter)),
    [memories, priorityFilter, statusFilter, typeFilter],
  );
  const expiredCount = visibleMemories.filter(isExpired).length;
  const reviewDueCount = visibleMemories.filter(isReviewDue).length;

  async function loadMemoryData() {
    setLoading(true);
    setError(null);

    try {
      const [memoryData, projectData, taskData] = await Promise.all([
        fetchMemories({
          priority: priorityFilter === "all" ? undefined : priorityFilter,
          status: statusFilter,
          type: typeFilter === "all" ? undefined : typeFilter,
        }),
        fetchProjects(),
        fetchTasks(),
      ]);
      const linkEntries = await Promise.all(
        memoryData.map(async (memory) => [memory.id, await fetchMemoryLinks(memory.id)] as const),
      );

      setMemories(memoryData);
      setProjects(projectData);
      setTasks(taskData);
      setLinksByMemoryId(Object.fromEntries(linkEntries));
    } catch {
      setError("No se pudieron cargar las memorias reales. Revisa Access y vuelve a intentarlo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMemoryData();
  }, [priorityFilter, statusFilter, typeFilter]);

  function openCreateForm() {
    setForm(emptyMemoryForm);
    setEditingMemoryId(null);
    setFormMode("create");
  }

  function openEditForm(memory: RealMemory) {
    setForm({
      content: memory.content,
      expiresAt: dateInputValue(memory.expiresAt),
      priority: memory.priority,
      reviewDueAt: dateInputValue(memory.reviewDueAt),
      title: memory.title,
      type: memory.type,
    });
    setEditingMemoryId(memory.id);
    setFormMode("edit");
  }

  function closeForm() {
    setForm(emptyMemoryForm);
    setEditingMemoryId(null);
    setFormMode(null);
  }

  function memoryPayload(
    data: FormData,
  ): Required<Pick<MemoryPayload, "title" | "content" | "type" | "priority">> & MemoryPayload {
    const expiresAt = formDataText(data, "expiresAt", form.expiresAt);
    const reviewDueAt = formDataText(data, "reviewDueAt", form.reviewDueAt);

    return {
      confidence: mediumConfidence,
      content: formDataText(data, "content", form.content),
      expiresAt: nullableDate(expiresAt),
      priority: formDataText(data, "priority", form.priority) as Priority,
      reviewDueAt: nullableDate(reviewDueAt),
      source: "manual",
      title: formDataText(data, "title", form.title),
      type: formDataText(data, "type", form.type) as RealMemoryType,
    };
  }

  async function handleSubmitMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = memoryPayload(new FormData(event.currentTarget));
      const isEditing = formMode === "edit" && Boolean(editingMemoryId);
      const memory =
        isEditing && editingMemoryId ? await updateMemory(editingMemoryId, payload) : await createMemory(payload);

      if (!isEditing) {
        setStatusFilter("active");
        setTypeFilter("all");
        setPriorityFilter("all");
        setLinksByMemoryId((currentLinks) => ({ ...currentLinks, [memory.id]: [] }));
      }

      setMemories((currentMemories) => upsertMemory(currentMemories, memory));
      closeForm();
    } catch {
      setError("No se pudo guardar la memoria. Comprueba los campos y vuelve a intentarlo.");
    } finally {
      setSaving(false);
    }
  }

  async function patchMemory(memory: RealMemory, payload: MemoryPayload) {
    setSaving(true);
    setError(null);

    try {
      const updated = await updateMemory(memory.id, payload);
      setMemories((currentMemories) => upsertMemory(currentMemories, updated));
    } catch {
      setError("No se pudo actualizar la memoria.");
    } finally {
      setSaving(false);
    }
  }

  async function markReviewed(memory: RealMemory) {
    setSaving(true);
    setError(null);

    try {
      const updated = await reviewMemory(memory.id);
      setMemories((currentMemories) => upsertMemory(currentMemories, updated));
    } catch {
      setError("No se pudo marcar la memoria como revisada.");
    } finally {
      setSaving(false);
    }
  }

  function updateLinkDraft(memoryId: string, draft: Partial<LinkDraft>) {
    setLinkDrafts((currentDrafts) => ({
      ...currentDrafts,
      [memoryId]: { ...(currentDrafts[memoryId] ?? defaultLinkDraft()), ...draft },
    }));
  }

  async function handleCreateLink(memory: RealMemory, draft: LinkDraft) {
    if (!draft.targetId) {
      setError(`Elige ${targetLabelWithArticle(draft.targetType)} antes de enlazar.`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const link = await createMemoryLink(memory.id, draft);
      setLinksByMemoryId((currentLinks) => ({
        ...currentLinks,
        [memory.id]: [link, ...(currentLinks[memory.id] ?? [])],
      }));
      updateLinkDraft(memory.id, { targetId: "" });
    } catch {
      setError("No se pudo crear el enlace. El destino puede no existir, no ser propio o ya estar enlazado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLink(memory: RealMemory, link: MemoryLink) {
    setSaving(true);
    setError(null);

    try {
      await deleteMemoryLink(memory.id, link.id);
      setLinksByMemoryId((currentLinks) => ({
        ...currentLinks,
        [memory.id]: (currentLinks[memory.id] ?? []).filter((item) => item.id !== link.id),
      }));
    } catch {
      setError("No se pudo quitar el enlace.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Memorias reales persistidas en D1, protegidas por Cloudflare Access y aisladas por identidad."
        eyebrow="D1 privado"
        title="Memoria"
      />

      <section className="summary-strip" aria-label="Resumen de memoria">
        <Badge tone="info">{visibleMemories.length} memorias reales</Badge>
        <Badge tone={statusFilter === "active" ? "success" : "neutral"}>
          {statusFilter === "active" ? "Activas" : "Archivadas"}
        </Badge>
        {expiredCount > 0 ? <Badge tone="warning">{expiredCount} caducadas</Badge> : null}
        {reviewDueCount > 0 ? <Badge tone="warning">{reviewDueCount} con revision pendiente</Badge> : null}
      </section>

      {error ? (
        <EmptyState badge="Error seguro" description={error} title="No se pudo completar la operacion">
          <Button onClick={() => void loadMemoryData()} variant="secondary">
            Reintentar
          </Button>
        </EmptyState>
      ) : null}

      <section className="filter-board" aria-label="Filtros de memoria">
        <FilterChipGroup
          label="Tipo"
          onChange={setTypeFilter}
          options={[
            { label: "Todos", value: "all" },
            { label: "Personal", value: "personal" },
            { label: "Proyecto", value: "project" },
            { label: "Decision", value: "decision" },
            { label: "Preferencia", value: "preference" },
            { label: "Tarea", value: "task_context" },
            { label: "Persona", value: "person" },
            { label: "Conocimiento", value: "knowledge" },
            { label: "Sistema", value: "system" },
          ]}
          value={typeFilter}
        />
        <FilterChipGroup
          label="Prioridad"
          onChange={setPriorityFilter}
          options={[
            { label: "Todas", value: "all" },
            { label: "P0", value: "P0" },
            { label: "P1", value: "P1" },
            { label: "P2", value: "P2" },
            { label: "P3", value: "P3" },
            { label: "P4", value: "P4" },
          ]}
          value={priorityFilter}
        />
        <FilterChipGroup
          label="Estado"
          onChange={setStatusFilter}
          options={[
            { label: "Activas", value: "active" },
            { label: "Archivadas", value: "archived" },
          ]}
          value={statusFilter}
        />
      </section>

      <SectionHeader
        action={
          <Button onClick={openCreateForm} variant="primary">
            Nueva memoria
          </Button>
        }
        description="Las archivadas solo aparecen al elegir ese filtro. La caducidad y revision avisan, no borran ni archivan."
        title="Contexto estructurado"
      />

      {formMode ? (
        <Card className="panel memory-form-panel">
          <SectionHeader
            description="Se guarda como fuente manual y confianza media, sin exponer campos internos."
            title={formMode === "edit" ? "Editar memoria" : "Nueva memoria"}
          />
          <form className="data-form" onSubmit={handleSubmitMemory}>
            <label>
              Titulo
              <input
                maxLength={180}
                name="title"
                onChange={(event) => {
                  const title = event.currentTarget.value;
                  setForm((draft) => ({ ...draft, title }));
                }}
                required
                value={form.title}
              />
            </label>
            <label>
              Contenido
              <textarea
                maxLength={8000}
                name="content"
                onChange={(event) => {
                  const content = event.currentTarget.value;
                  setForm((draft) => ({ ...draft, content }));
                }}
                required
                rows={6}
                value={form.content}
              />
            </label>
            <div className="data-form__row data-form__row--triple">
              <label>
                Tipo
                <select
                  name="type"
                  onChange={(event) => {
                    const type = event.currentTarget.value as RealMemoryType;
                    setForm((draft) => ({ ...draft, type }));
                  }}
                  value={form.type}
                >
                  {memoryTypes.map((type) => (
                    <option key={type} value={type}>
                      {typeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prioridad
                <select
                  name="priority"
                  onChange={(event) => {
                    const priority = event.currentTarget.value as Priority;
                    setForm((draft) => ({ ...draft, priority }));
                  }}
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
                Caduca
                <input
                  name="expiresAt"
                  onChange={(event) => {
                    const expiresAt = event.currentTarget.value;
                    setForm((draft) => ({ ...draft, expiresAt }));
                  }}
                  onInput={(event) => {
                    const expiresAt = event.currentTarget.value;
                    setForm((draft) => ({ ...draft, expiresAt }));
                  }}
                  type="date"
                  value={form.expiresAt}
                />
              </label>
            </div>
            <label>
              Revisar el
              <input
                name="reviewDueAt"
                onChange={(event) => {
                  const reviewDueAt = event.currentTarget.value;
                  setForm((draft) => ({ ...draft, reviewDueAt }));
                }}
                onInput={(event) => {
                  const reviewDueAt = event.currentTarget.value;
                  setForm((draft) => ({ ...draft, reviewDueAt }));
                }}
                type="date"
                value={form.reviewDueAt}
              />
            </label>
            <div className="memory-form-actions">
              <Button disabled={saving} type="submit" variant="primary">
                {formMode === "edit" ? "Guardar cambios" : "Crear memoria"}
              </Button>
              <Button disabled={saving} onClick={closeForm} variant="ghost">
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <SectionHeader
        action={<Badge tone="info">{visibleMemories.length} visibles</Badge>}
        title={statusFilter === "active" ? "Memorias activas" : "Memorias archivadas"}
      />

      {loading ? (
        <EmptyState
          badge="Cargando"
          description="JARVIS esta leyendo memorias reales desde D1."
          title="Cargando memoria"
        />
      ) : visibleMemories.length === 0 ? (
        <EmptyState
          badge="Sin datos reales"
          description="No hay memorias reales en esta vista. Crea una memoria para empezar a persistir contexto."
          title="No hay memorias todavia"
        >
          <Button onClick={openCreateForm} variant="primary">
            Nueva memoria
          </Button>
        </EmptyState>
      ) : (
        <section className="memory-card-grid">
          {visibleMemories.map((memory) => {
            const expired = isExpired(memory);
            const reviewDue = isReviewDue(memory);
            const links = linksByMemoryId[memory.id] ?? [];
            const draft = linkDrafts[memory.id] ?? defaultLinkDraft();
            const options =
              draft.targetType === "project" ? projectOptions(projects) : taskOptions(tasks);
            const linkedIds = linkedTargetIds(links, draft.targetType);
            const availableOptions = options.filter((option) => !linkedIds.has(option.id));
            const noTargets = options.length === 0;
            const noAvailableTargets = options.length > 0 && availableOptions.length === 0;

            return (
              <article className={memoryCardClassName(expired, reviewDue)} key={memory.id}>
                <div className="memory-card__top">
                  <span>{typeLabels[memory.type]}</span>
                  <PriorityBadge priority={memory.priority} />
                </div>
                <h3>{memory.title}</h3>
                <p className="memory-card__content">{memory.content}</p>
                <div className="memory-card__meta">
                  <StatusBadge status={memory.status} />
                  <span>Actualizada: {formatDate(memory.updatedAt)}</span>
                  <span>Caduca: {formatDate(memory.expiresAt)}</span>
                  <span>Revisar: {formatDate(memory.reviewDueAt)}</span>
                </div>
                {expired ? (
                  <div className="memory-card__warning" role="status">
                    <Badge className="memory-card__expired-badge" tone="warning">
                      Caducada
                    </Badge>
                    <span>Esta memoria supero su fecha de caducidad. No se archiva automaticamente.</span>
                  </div>
                ) : null}
                {reviewDue ? (
                  <div className="memory-card__warning memory-card__warning--review" role="status">
                    <Badge className="memory-card__review-badge" tone="warning">
                      Revision pendiente
                    </Badge>
                    <span>La fecha de revision manual ya paso. Puedes marcarla revisada sin cambiar contenido.</span>
                  </div>
                ) : null}

                <section className="memory-card__links" aria-label={`Enlaces de ${memory.title}`}>
                  <div className="memory-card__link-header">
                    <strong>Enlaces</strong>
                    <span>{links.length} vinculados</span>
                  </div>
                  {links.length > 0 ? (
                    <div className="memory-link-list">
                      {links.map((link) => (
                        <span className="memory-link-chip" key={link.id}>
                          <span>
                            <strong>{link.targetType === "project" ? "Proyecto" : "Tarea"}</strong>
                            {link.targetTitle}
                            {link.targetStatus ? <small>{link.targetStatus}</small> : null}
                          </span>
                          <button
                            disabled={saving}
                            onClick={() => void handleDeleteLink(memory, link)}
                            type="button"
                          >
                            Quitar
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">Sin enlaces todavia.</p>
                  )}
                  <div className="memory-link-form">
                    <div className="memory-link-form__row">
                      <label>
                        Tipo de enlace
                        <select
                          disabled={saving}
                          onChange={(event) =>
                            updateLinkDraft(memory.id, {
                              targetId: "",
                              targetType: event.currentTarget.value as MemoryLinkTargetType,
                            })
                          }
                          value={draft.targetType}
                        >
                          <option value="project">Proyecto</option>
                          <option value="task">Tarea</option>
                        </select>
                      </label>
                      <label>
                        Destino
                        <select
                          disabled={saving || availableOptions.length === 0}
                          onChange={(event) => updateLinkDraft(memory.id, { targetId: event.currentTarget.value })}
                          value={draft.targetId}
                        >
                          <option value="">
                            {noTargets
                              ? `No hay ${targetPluralLabel(draft.targetType)} reales`
                              : noAvailableTargets
                                ? `Sin ${targetPluralLabel(draft.targetType)} disponibles`
                                : `Elegir ${targetLabel(draft.targetType)}`}
                          </option>
                          {availableOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {noTargets ? (
                      <p className="text-muted">No hay {targetPluralLabel(draft.targetType)} reales disponibles.</p>
                    ) : noAvailableTargets ? (
                      <p className="text-muted">{allTargetsLinkedMessage(draft.targetType)}</p>
                    ) : null}
                    <Button
                      disabled={saving || !draft.targetId}
                      onClick={() => void handleCreateLink(memory, draft)}
                      variant="secondary"
                    >
                      Enlazar
                    </Button>
                  </div>
                </section>

                <div className="memory-card__actions">
                  <Button disabled={saving} onClick={() => openEditForm(memory)} variant="secondary">
                    Editar
                  </Button>
                  {reviewDue ? (
                    <Button disabled={saving} onClick={() => void markReviewed(memory)} variant="primary">
                      Marcar revisada
                    </Button>
                  ) : null}
                  <Button
                    disabled={saving}
                    onClick={() =>
                      void patchMemory(memory, {
                        status: memory.status === "archived" ? "active" : "archived",
                      })
                    }
                    variant={memory.status === "archived" ? "primary" : "ghost"}
                  >
                    {memory.status === "archived" ? "Reactivar" : "Archivar"}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
