import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterChipGroup } from "../components/ui/FilterChipGroup";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import {
  createReminder,
  fetchReminders,
  updateReminder,
  type RealReminder,
  type RealReminderStatus,
  type ReminderFilters,
} from "../lib/api/reminders";
import type { Priority } from "../types/jarvis";

type ReminderViewFilter = "pending" | "overdue" | "completed" | "dismissed" | "all";
type PriorityFilter = Priority | "all";

interface ReminderFormState {
  title: string;
  notes: string;
  dueAtLocal: string;
  priority: Priority;
}

const priorityOptions: Priority[] = ["P0", "P1", "P2", "P3", "P4"];

const viewOptions: { label: string; value: ReminderViewFilter }[] = [
  { label: "Pendientes", value: "pending" },
  { label: "Vencidos", value: "overdue" },
  { label: "Completados", value: "completed" },
  { label: "Descartados", value: "dismissed" },
  { label: "Todos", value: "all" },
];

const priorityFilterOptions: { label: string; value: PriorityFilter }[] = [
  { label: "Todas", value: "all" },
  ...priorityOptions.map((priority) => ({ label: priority, value: priority })),
];

const statusLabels: Record<RealReminderStatus, string> = {
  pending: "Pendiente",
  completed: "Completado",
  dismissed: "Descartado",
};

const statusTones: Record<RealReminderStatus, "neutral" | "info" | "success" | "warning"> = {
  pending: "info",
  completed: "success",
  dismissed: "neutral",
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function toLocalInputValue(isoDate: string): string {
  const date = new Date(isoDate);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function defaultDueAtLocal(): string {
  const nextHour = new Date(Date.now() + 60 * 60_000);
  nextHour.setMinutes(0, 0, 0);
  return toLocalInputValue(nextHour.toISOString());
}

function toIsoFromLocal(localValue: string): string | null {
  const date = new Date(localValue);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function formatDateTime(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

function reminderFilters(viewFilter: ReminderViewFilter, priorityFilter: PriorityFilter): ReminderFilters {
  const filters: ReminderFilters = {};

  if (viewFilter === "pending") {
    filters.status = "pending";
  }

  if (viewFilter === "overdue") {
    filters.scope = "overdue";
  }

  if (viewFilter === "completed") {
    filters.status = "completed";
  }

  if (viewFilter === "dismissed") {
    filters.status = "dismissed";
  }

  if (viewFilter === "all") {
    filters.scope = "all";
  }

  if (priorityFilter !== "all") {
    filters.priority = priorityFilter;
  }

  return filters;
}

function isOverdue(reminder: RealReminder): boolean {
  return reminder.status === "pending" && new Date(reminder.dueAt).getTime() < Date.now();
}

function statusBadge(reminder: RealReminder) {
  if (isOverdue(reminder)) {
    return <Badge tone="warning">Vencido</Badge>;
  }

  return <Badge tone={statusTones[reminder.status]}>{statusLabels[reminder.status]}</Badge>;
}

function emptyCopy(viewFilter: ReminderViewFilter): { title: string; description: string } {
  if (viewFilter === "overdue") {
    return {
      title: "No hay recordatorios vencidos",
      description: "Los recordatorios pendientes fuera de fecha apareceran aqui.",
    };
  }

  if (viewFilter === "completed") {
    return {
      title: "No hay recordatorios completados",
      description: "Marca un recordatorio como completado para verlo en esta vista.",
    };
  }

  if (viewFilter === "dismissed") {
    return {
      title: "No hay recordatorios descartados",
      description: "Los descartes son reversibles y permanecen separados de pendientes.",
    };
  }

  return {
    title: "No hay recordatorios todavia",
    description: "Crea un recordatorio real para fijar una fecha y hora concreta.",
  };
}

export function RemindersPage() {
  const [reminders, setReminders] = useState<RealReminder[]>([]);
  const [viewFilter, setViewFilter] = useState<ReminderViewFilter>("pending");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [form, setForm] = useState<ReminderFormState>({
    title: "",
    notes: "",
    dueAtLocal: defaultDueAtLocal(),
    priority: "P2",
  });

  const filters = useMemo(
    () => reminderFilters(viewFilter, priorityFilter),
    [priorityFilter, viewFilter],
  );

  const loadReminders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchReminders(filters);
      setReminders(data);
    } catch {
      setError("No se pudieron cargar los recordatorios.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadReminders();
  }, [loadReminders]);

  const emptyState = emptyCopy(viewFilter);
  const overdueCount = reminders.filter(isOverdue).length;

  function openCreateForm() {
    setFormMode("create");
    setEditingReminderId(null);
    setForm({
      title: "",
      notes: "",
      dueAtLocal: defaultDueAtLocal(),
      priority: "P2",
    });
  }

  function openEditForm(reminder: RealReminder) {
    setFormMode("edit");
    setEditingReminderId(reminder.id);
    setForm({
      title: reminder.title,
      notes: reminder.notes ?? "",
      dueAtLocal: toLocalInputValue(reminder.dueAt),
      priority: reminder.priority,
    });
  }

  function closeForm() {
    setFormMode(null);
    setEditingReminderId(null);
  }

  async function handleSubmitReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dueAt = toIsoFromLocal(form.dueAtLocal);
    if (!dueAt) {
      setError("La fecha y hora no son validas.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      title: form.title,
      notes: form.notes.trim() ? form.notes : null,
      dueAt,
      priority: form.priority,
    };

    try {
      if (formMode === "edit" && editingReminderId) {
        await updateReminder(editingReminderId, payload);
        closeForm();
        await loadReminders();
        return;
      }

      await createReminder(payload);
      closeForm();

      if (viewFilter !== "pending") {
        setViewFilter("pending");
      } else {
        await loadReminders();
      }
    } catch {
      setError("No se pudo guardar el recordatorio.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateReminderStatus(reminder: RealReminder, status: RealReminderStatus) {
    setIsSaving(true);
    setError(null);

    try {
      await updateReminder(reminder.id, { status });
      await loadReminders();
    } catch {
      setError("No se pudo actualizar el estado del recordatorio.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Fechas concretas para mantener contexto operativo dentro de JARVIS."
        eyebrow="D1 privado"
        title="Recordatorios"
      />

      <section className="summary-strip" aria-label="Resumen de recordatorios">
        <Badge tone="info">{reminders.length} visibles</Badge>
        <Badge tone={overdueCount > 0 ? "warning" : "success"}>
          {overdueCount > 0 ? `${overdueCount} vencidos` : "Sin vencidos visibles"}
        </Badge>
      </section>

      <FilterChipGroup
        label="Vista"
        onChange={setViewFilter}
        options={viewOptions}
        value={viewFilter}
      />

      <FilterChipGroup
        label="Prioridad"
        onChange={setPriorityFilter}
        options={priorityFilterOptions}
        value={priorityFilter}
      />

      {error ? (
        <EmptyState badge="Error seguro" description={error} title="No se pudo completar la operacion">
          <Button onClick={() => void loadReminders()} variant="secondary">
            Reintentar
          </Button>
        </EmptyState>
      ) : null}

      <SectionHeader
        action={
          <Button onClick={openCreateForm} variant="primary">
            Nuevo recordatorio
          </Button>
        }
        description="Titulo, nota opcional, fecha/hora y prioridad."
        title="Senales pendientes"
      />

      {formMode ? (
        <Card className="panel reminder-form-panel">
          <SectionHeader
            description="La fecha se guarda en UTC y se muestra en tu zona local."
            title={formMode === "edit" ? "Editar recordatorio" : "Nuevo recordatorio"}
          />
          <form className="data-form" onSubmit={handleSubmitReminder}>
            <label>
              Titulo
              <input
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                value={form.title}
              />
            </label>

            <label>
              Nota
              <textarea
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                rows={4}
                value={form.notes}
              />
            </label>

            <div className="data-form__row">
              <label>
                Fecha y hora
                <input
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dueAtLocal: event.target.value }))
                  }
                  required
                  type="datetime-local"
                  value={form.dueAtLocal}
                />
              </label>

              <label>
                Prioridad
                <select
                  onChange={(event) =>
                    setForm((current) => ({ ...current, priority: event.target.value as Priority }))
                  }
                  value={form.priority}
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="memory-form-actions">
              <Button disabled={isSaving} type="submit" variant="primary">
                {formMode === "edit" ? "Guardar cambios" : "Crear recordatorio"}
              </Button>
              <Button disabled={isSaving} onClick={closeForm} variant="ghost">
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {isLoading && reminders.length === 0 ? (
        <EmptyState
          badge="Cargando"
          description="Leyendo recordatorios privados desde D1."
          title="Cargando recordatorios"
        />
      ) : null}

      {!isLoading && reminders.length === 0 && !error ? (
        <EmptyState badge="D1 real" description={emptyState.description} title={emptyState.title}>
          <Button onClick={openCreateForm} variant="primary">
            Nuevo recordatorio
          </Button>
        </EmptyState>
      ) : null}

      {reminders.length > 0 ? (
        <section className="reminder-list" aria-label="Recordatorios">
          {reminders.map((reminder) => (
            <Card
              className={
                isOverdue(reminder)
                  ? "reminder-card reminder-card--real reminder-card--overdue"
                  : "reminder-card reminder-card--real"
              }
              key={reminder.id}
            >
              <div className="reminder-card__body">
                <div className="reminder-card__title">
                  <span>{formatDateTime(reminder.dueAt)}</span>
                  <h2>{reminder.title}</h2>
                </div>

                {reminder.notes ? <p className="reminder-card__notes">{reminder.notes}</p> : null}

                <div className="reminder-card__meta">
                  <PriorityBadge priority={reminder.priority} />
                  {statusBadge(reminder)}
                  <span>Actualizado {formatDateTime(reminder.updatedAt)}</span>
                </div>
              </div>

              <div className="reminder-card__actions">
                <Button disabled={isSaving} onClick={() => openEditForm(reminder)} variant="secondary">
                  Editar
                </Button>

                {reminder.status === "pending" ? (
                  <>
                    <Button
                      disabled={isSaving}
                      onClick={() => void updateReminderStatus(reminder, "completed")}
                      variant="secondary"
                    >
                      Completar
                    </Button>
                    <Button
                      disabled={isSaving}
                      onClick={() => void updateReminderStatus(reminder, "dismissed")}
                      variant="ghost"
                    >
                      Descartar
                    </Button>
                  </>
                ) : null}

                {reminder.status === "completed" ? (
                  <Button
                    disabled={isSaving}
                    onClick={() => void updateReminderStatus(reminder, "pending")}
                    variant="secondary"
                  >
                    Reabrir
                  </Button>
                ) : null}

                {reminder.status === "dismissed" ? (
                  <Button
                    disabled={isSaving}
                    onClick={() => void updateReminderStatus(reminder, "pending")}
                    variant="secondary"
                  >
                    Reactivar
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
