import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

const taskGroups = [
  { title: "Hoy", items: ["Validar responsive en iPhone", "Revisar build para Cloudflare Pages"] },
  { title: "Después", items: ["Diseñar tablas D1", "Definir contrato de conversaciones"] }
];

export function TasksPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Bandeja inicial para ejecución diaria. Todavía no guarda cambios ni agenda acciones."
        eyebrow="Ejecución"
        title="Tareas"
      />

      <section className="two-column-grid">
        {taskGroups.map((group) => (
          <Card className="panel" key={group.title}>
            <div className="panel__header">
              <div>
                <span>Lista mock</span>
                <h2>{group.title}</h2>
              </div>
              <Badge>{group.items.length} items</Badge>
            </div>
            <ul className="check-list">
              {group.items.map((item) => (
                <li key={item}>
                  <span aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <EmptyState
        badge="Sin persistencia"
        description="Los datos son locales de ejemplo. La captura y sincronización de tareas queda fuera de Sprint 1."
        title="Tareas reales en fase posterior"
      />
    </div>
  );
}
