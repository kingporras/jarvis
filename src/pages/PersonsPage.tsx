import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

const persons = [
  { name: "Victor", context: "Usuario principal y propietario del sistema." },
  { name: "Equipo futuro", context: "Contactos manuales que podrán relacionarse con proyectos." }
];

export function PersonsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Directorio manual para recordar contexto humano sin conectar contactos ni servicios externos."
        eyebrow="Relaciones"
        title="Personas"
      />

      <section className="two-column-grid">
        {persons.map((person) => (
          <Card className="person-card" key={person.name}>
            <div className="avatar-mark" aria-hidden="true">
              {person.name.slice(0, 1)}
            </div>
            <div>
              <h2>{person.name}</h2>
              <p>{person.context}</p>
              <Badge>Manual</Badge>
            </div>
          </Card>
        ))}
      </section>

      <EmptyState
        badge="Sin integraciones"
        description="No se importa información de Gmail, Calendar, Drive, Slack ni contactos del teléfono."
        title="Personas creadas a mano"
      />
    </div>
  );
}
