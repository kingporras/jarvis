import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";

const memoryAreas = [
  "Identidad, preferencias y reglas de trabajo de Victor.",
  "Conocimiento de proyectos, personas y decisiones.",
  "Enlaces entre notas, tareas y conversaciones futuras."
];

export function MemoryPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="La memoria editable será el núcleo de JARVIS: contexto privado, revisable y exportable."
        eyebrow="Reactor arc"
        title="Memoria"
      />

      <section className="split-layout">
        <Card className="reactor-panel" tone="accent">
          <div className="reactor-core" aria-hidden="true">
            <span />
          </div>
          <div>
            <h2>Núcleo editable</h2>
            <p>
              Este espacio reserva la arquitectura visual para una memoria que Victor pueda revisar,
              corregir y conectar con el resto del sistema.
            </p>
          </div>
        </Card>

        <Card className="panel">
          <div className="panel__header">
            <div>
              <span>Preparado para crecer</span>
              <h2>Capas previstas</h2>
            </div>
            <Badge tone="success">Sin datos reales</Badge>
          </div>
          <ul className="quiet-list">
            {memoryAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
