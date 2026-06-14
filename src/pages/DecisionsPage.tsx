import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";

const decisions = [
  {
    title: "Dashboard primero",
    reason: "JARVIS debe sentirse como sistema operativo personal, no como chatbot genérico."
  },
  {
    title: "Sin router externo por ahora",
    reason: "El estado local cubre la navegación inicial con menos complejidad."
  },
  {
    title: "CSS propio",
    reason: "Reduce dependencias y mantiene el lenguaje visual bajo control."
  }
];

export function DecisionsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Espacio para registrar decisiones, motivos y aprendizajes. Por ahora solo muestra estructura."
        eyebrow="Criterio"
        title="Decisiones"
      />

      <section className="decision-list">
        {decisions.map((decision) => (
          <Card className="decision-item" key={decision.title}>
            <div>
              <Badge tone="info">Decision mock</Badge>
              <h2>{decision.title}</h2>
            </div>
            <p>{decision.reason}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
