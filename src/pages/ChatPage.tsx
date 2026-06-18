import { useState } from "react";
import { ChatMessage } from "../components/chat/ChatMessage";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DemoNotice } from "../components/ui/DemoNotice";
import { SectionHeader } from "../components/ui/SectionHeader";
import {
  chatMessages,
  dailyFocus,
  projects,
  suggestedPrompts,
  tasks,
} from "../data/mockJarvisData";

export function ChatPage() {
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const topTasks = tasks.filter((task) => task.priority === "P0").slice(0, 2);

  return (
    <div className="page-stack">
      <PageHeader
        description="Contexto, prioridades y proximos pasos en un solo lugar. Vista estatica sin modelo conectado."
        eyebrow="IA no conectada"
        title="Chat JARVIS"
      />

      <section className="chat-workspace">
        <Card className="chat-shell">
          <div className="chat-shell__header">
            <div>
              <h2>Conversacion de ejemplo</h2>
              <p>Canal ejecutivo futuro. Las respuestas no se generan en tiempo real.</p>
            </div>
            <Badge tone="warning">Demo</Badge>
          </div>

          <div className="message-list" aria-label="Mensajes de ejemplo">
            {chatMessages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>

          <div className="suggested-prompts" aria-label="Sugerencias locales">
            {suggestedPrompts.map((prompt) => (
              <button
                aria-pressed={draft === prompt}
                className={draft === prompt ? "filter-chip filter-chip--active" : "filter-chip"}
                key={prompt}
                onClick={() => {
                  setDraft(prompt);
                  setNotice("Sugerencia copiada al input local. No se ha enviado nada.");
                }}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              aria-label="Mensaje de demostracion"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="La IA real se conectara en un sprint posterior."
              value={draft}
            />
            <Button
              onClick={() => setNotice("Modo demo: ningun mensaje ha sido enviado.")}
              variant="secondary"
            >
              Enviar
            </Button>
          </div>
          {notice ? <DemoNotice>{notice}</DemoNotice> : null}
        </Card>

        <aside className="context-rail">
          <Card className="panel">
            <SectionHeader eyebrow="Contexto actual" title={dailyFocus.linkedProject} />
            <p>{dailyFocus.context}</p>
            <Badge tone="info">{projects[0]?.phase}</Badge>
          </Card>

          <Card className="panel">
            <SectionHeader eyebrow="Prioridades" title="Hoy" />
            <div className="compact-list">
              {topTasks.map((task) => (
                <article key={task.id}>
                  <span>{task.priority}</span>
                  <strong>{task.title}</strong>
                  <p>{task.context}</p>
                </article>
              ))}
            </div>
          </Card>

          <DemoNotice>
            No hay OpenAI, agentes ni streaming. La conversacion es una maqueta local.
          </DemoNotice>
        </aside>
      </section>
    </div>
  );
}
