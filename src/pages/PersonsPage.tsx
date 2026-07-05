import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterChipGroup } from "../components/ui/FilterChipGroup";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  createPerson,
  fetchPersons,
  updatePerson,
  type PersonPayload,
  type RealPerson,
  type RealPersonStatus,
} from "../lib/api/persons";

type FormMode = "create" | "edit";

const emptyPersonForm = {
  name: "",
  notes: "",
  relationship: "",
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

function avatarInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || "P";
}

function upsertPerson(persons: RealPerson[], person: RealPerson): RealPerson[] {
  const exists = persons.some((item) => item.id === person.id);
  const nextPersons = exists
    ? persons.map((item) => (item.id === person.id ? person : item))
    : [person, ...persons];

  return [...nextPersons].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}

export function PersonsPage() {
  const [persons, setPersons] = useState<RealPerson[]>([]);
  const [statusFilter, setStatusFilter] = useState<RealPersonStatus>("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPersonForm);

  const visiblePersons = useMemo(
    () => persons.filter((person) => person.status === statusFilter),
    [persons, statusFilter],
  );

  async function loadPersons() {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchPersons({ status: statusFilter });
      setPersons(data);
    } catch {
      setError("No se pudieron cargar las personas reales. Revisa Access y vuelve a intentarlo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPersons();
  }, [statusFilter]);

  function openCreateForm() {
    setForm(emptyPersonForm);
    setEditingPersonId(null);
    setFormMode("create");
  }

  function openEditForm(person: RealPerson) {
    setForm({
      name: person.name,
      notes: person.notes ?? "",
      relationship: person.relationship ?? "",
    });
    setEditingPersonId(person.id);
    setFormMode("edit");
  }

  function closeForm() {
    setForm(emptyPersonForm);
    setEditingPersonId(null);
    setFormMode(null);
  }

  function personPayload(): Required<Pick<PersonPayload, "name">> & PersonPayload {
    return {
      name: form.name,
      notes: cleanText(form.notes),
      relationship: cleanText(form.relationship),
    };
  }

  async function handleSubmitPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const isEditing = formMode === "edit" && Boolean(editingPersonId);
      const payload = personPayload();
      const person =
        isEditing && editingPersonId ? await updatePerson(editingPersonId, payload) : await createPerson(payload);

      if (!isEditing) {
        setStatusFilter("active");
      }

      setPersons((currentPersons) => upsertPerson(currentPersons, person));
      closeForm();
    } catch {
      setError("No se pudo guardar la persona. Comprueba el nombre y vuelve a intentarlo.");
    } finally {
      setSaving(false);
    }
  }

  async function updatePersonStatus(person: RealPerson, status: RealPersonStatus) {
    setSaving(true);
    setError(null);

    try {
      const updated = await updatePerson(person.id, { status });
      setPersons((currentPersons) => upsertPerson(currentPersons, updated));
    } catch {
      setError("No se pudo actualizar el estado de la persona.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Relaciones clave guardadas de forma privada para el contexto de JARVIS."
        eyebrow="D1 privado"
        title="Personas"
      />

      <section className="summary-strip" aria-label="Resumen de personas">
        <Badge tone="info">{persons.length} personas reales</Badge>
        <Badge tone={statusFilter === "active" ? "success" : "neutral"}>
          {statusFilter === "active" ? "Activas" : "Archivadas"}
        </Badge>
      </section>

      <FilterChipGroup
        label="Estado"
        onChange={setStatusFilter}
        options={[
          { label: "Activas", value: "active" },
          { label: "Archivadas", value: "archived" },
        ]}
        value={statusFilter}
      />

      {error ? (
        <EmptyState badge="Error seguro" description={error} title="No se pudo completar la operacion">
          <Button onClick={() => void loadPersons()} variant="secondary">
            Reintentar
          </Button>
        </EmptyState>
      ) : null}

      <SectionHeader
        action={
          <Button onClick={openCreateForm} variant="primary">
            Nueva persona
          </Button>
        }
        description="Nombre, relacion libre y notas manuales."
        title="Relaciones y contexto"
      />

      {formMode ? (
        <Card className="panel person-form-panel">
          <SectionHeader
            description="Actualiza el contexto manual de esta relacion."
            title={formMode === "edit" ? "Editar persona" : "Nueva persona"}
          />
          <form className="data-form" onSubmit={handleSubmitPerson}>
            <label>
              Nombre
              <input
                maxLength={180}
                onChange={(event) => setForm((draft) => ({ ...draft, name: event.target.value }))}
                required
                value={form.name}
              />
            </label>
            <label>
              Relacion
              <input
                maxLength={180}
                onChange={(event) => setForm((draft) => ({ ...draft, relationship: event.target.value }))}
                placeholder="pareja, amigo, companero, familiar..."
                value={form.relationship}
              />
            </label>
            <label>
              Notas
              <textarea
                maxLength={4000}
                onChange={(event) => setForm((draft) => ({ ...draft, notes: event.target.value }))}
                rows={4}
                value={form.notes}
              />
            </label>
            <div className="memory-form-actions">
              <Button disabled={saving} type="submit" variant="primary">
                {formMode === "edit" ? "Guardar cambios" : "Crear persona"}
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
          description="JARVIS esta leyendo personas reales desde D1."
          title="Cargando personas"
        />
      ) : visiblePersons.length === 0 ? (
        <EmptyState
          badge="Sin datos reales"
          description="No hay personas reales en esta vista. Crea una persona para guardar contexto manual."
          title="No hay personas todavia"
        >
          <Button onClick={openCreateForm} variant="secondary">
            Nueva persona
          </Button>
        </EmptyState>
      ) : (
        <section className="people-grid">
          {visiblePersons.map((person) => (
            <Card className="person-card person-card--real" key={person.id}>
              <div className="avatar-mark" aria-hidden="true">
                {avatarInitial(person.name)}
              </div>
              <div className="person-card__body">
                <div className="person-card__title">
                  <h2>{person.name}</h2>
                  <StatusBadge status={person.status} />
                </div>
                {person.relationship ? <p>{person.relationship}</p> : null}
                {person.notes ? <p className="person-card__notes">{person.notes}</p> : null}
                <div className="person-card__meta">
                  <span>Actualizada: {formatDate(person.updatedAt)}</span>
                  {person.archivedAt ? <span>Archivada: {formatDate(person.archivedAt)}</span> : null}
                </div>
                <div className="person-card__actions">
                  <Button disabled={saving} onClick={() => openEditForm(person)} variant="secondary">
                    Editar
                  </Button>
                  <Button
                    disabled={saving}
                    onClick={() =>
                      void updatePersonStatus(person, person.status === "archived" ? "active" : "archived")
                    }
                    variant="ghost"
                  >
                    {person.status === "archived" ? "Reactivar" : "Archivar"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
