import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";

const messages = [
  {
    author: "Victor",
    text: "Cuando llegue Sprint 2, quiero preguntarte por proyectos, memoria y decisiones."
  },
  {
    author: "JARVIS",
    text: "Recibido. En Sprint 1 solo preparo la interfaz; no hay modelo IA conectado."
  }
];

export function ChatPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="El chat será una puerta de entrada, no el producto completo. La conexión a IA queda fuera de este sprint."
        eyebrow="Modulo conversacional"
        title="Chat JARVIS"
      />

      <Card className="chat-shell">
        <div className="chat-shell__header">
          <div>
            <h2>Conversación futura</h2>
            <p>Placeholder visual sin OpenAI API, sin agentes y sin backend.</p>
          </div>
          <Badge tone="warning">Desconectado</Badge>
        </div>

        <div className="message-list" aria-label="Mensajes de ejemplo">
          {messages.map((message) => (
            <article className="message" key={`${message.author}-${message.text}`}>
              <strong>{message.author}</strong>
              <p>{message.text}</p>
            </article>
          ))}
        </div>

        <EmptyState
          badge="Sprint 2"
          description="Aquí se conectará el backend y el modelo cuando existan memoria, sesiones y conversaciones reales."
          title="Entrada preparada, motor pendiente"
        >
          <Button disabled variant="primary">
            Enviar deshabilitado
          </Button>
        </EmptyState>
      </Card>
    </div>
  );
}
