import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { DemoNotice } from "../components/ui/DemoNotice";
import { SectionHeader } from "../components/ui/SectionHeader";
import { persons } from "../data/mockJarvisData";

export function PersonsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Contexto humano manual y ficticio, sin contactos reales ni integraciones externas."
        eyebrow="Datos ficticios"
        title="Personas"
      />

      <SectionHeader
        action={<Badge tone="info">{persons.length} fichas mock</Badge>}
        description="Ejemplos genericos para probar como se relacionarian personas, proyectos y decisiones."
        title="Relaciones y contexto"
      />

      <section className="people-grid">
        {persons.map((person) => (
          <Card className="person-card" key={person.id}>
            <div className="avatar-mark" aria-hidden="true">
              {person.name.slice(-1)}
            </div>
            <div>
              <div className="person-card__title">
                <h2>{person.name}</h2>
                <Badge>Manual</Badge>
              </div>
              <p>{person.context}</p>
              <div className="person-card__meta">
                <span>{person.role}</span>
                <span>{person.relation}</span>
                <span>{person.lastInteraction}</span>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <DemoNotice>
        No se importa informacion de Gmail, Calendar, Drive, contactos, Slack ni servicios externos.
      </DemoNotice>
    </div>
  );
}
