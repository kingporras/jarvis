import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import {
  isContextualChatError,
  sendContextualChatMessage,
  type ChatMode,
  type ContextualChatResponse,
  type UsedContext,
} from "../lib/api/contextualChat";

type ChatAuthor = "Victor" | "JARVIS";

interface LocalMessage {
  author: ChatAuthor;
  id: string;
  text: string;
}

const initialMessages: LocalMessage[] = [
  {
    author: "JARVIS",
    id: "jarvis-initial",
    text: "Estoy conectado al contexto privado de JARVIS. Preguntame por prioridades, proyectos, tareas, memoria, decisiones, personas o recordatorios.",
  },
];

const initialFollowUps = [
  "Dame el resumen ejecutivo de ahora.",
  "Que requiere mi atencion hoy?",
  "Que riesgos ves en los datos actuales?",
];

const modeLabels: Record<ChatMode, string> = {
  priorities: "Prioridades",
  projects: "Proyectos",
  tasks: "Tareas",
  memory: "Memoria",
  decisions: "Decisiones",
  persons: "Personas",
  reminders: "Recordatorios",
  overview: "Resumen",
};

const contextLabels: Record<keyof UsedContext, string> = {
  briefing: "Briefing",
  projects: "Proyectos",
  tasks: "Tareas",
  memory: "Memoria",
  decisions: "Decisiones",
  persons: "Personas",
  reminders: "Recordatorios",
  links: "Enlaces",
};

function newMessageId(author: ChatAuthor): string {
  return `${author.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatGeneratedAt(value: string | null): string {
  if (!value) {
    return "Sin respuesta aun";
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function userErrorMessage(error: unknown): string {
  if (isContextualChatError(error)) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return "OpenAI no esta configurado en el backend. Falta definir la clave o el modelo.";
    }

    if (error.status === 401 || error.status === 403) {
      return "La sesion privada no esta validada para este chat.";
    }

    if (error.status === 400) {
      return "Revisa el mensaje y vuelve a enviarlo.";
    }
  }

  return "No se pudo generar la respuesta. Vuelve a intentarlo.";
}

export function ChatPage() {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<ContextualChatResponse | null>(null);

  const followUps = lastResponse?.suggestedFollowUps.length
    ? lastResponse.suggestedFollowUps
    : initialFollowUps;
  const activeContext = lastResponse
    ? (Object.entries(lastResponse.usedContext) as [keyof UsedContext, boolean][]).filter(
        ([, used]) => used,
      )
    : [];

  async function submitMessage(rawMessage: string): Promise<void> {
    const message = rawMessage.trim();

    if (sending) {
      return;
    }

    if (!message) {
      setError("Escribe una pregunta para JARVIS.");
      return;
    }

    const userMessage: LocalMessage = {
      author: "Victor",
      id: newMessageId("Victor"),
      text: message,
    };

    setDraft("");
    setError(null);
    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setSending(true);

    try {
      const response = await sendContextualChatMessage(message);
      setLastResponse(response);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          author: "JARVIS",
          id: newMessageId("JARVIS"),
          text: response.answer,
        },
      ]);
    } catch (caughtError) {
      setError(userErrorMessage(caughtError));
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submitMessage(draft);
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Conversacion contextual con datos privados reales de JARVIS."
        eyebrow="API privada"
        title="Chat JARVIS"
      />

      <section className="chat-workspace">
        <Card className="chat-shell">
          <div className="chat-shell__header">
            <div>
              <h2>Conversacion contextual</h2>
              <p>{sending ? "Generando respuesta..." : "Listo para consultar el contexto real."}</p>
            </div>
            <Badge tone={sending ? "warning" : "success"}>{sending ? "Pensando" : "Privado"}</Badge>
          </div>

          <div className="message-list" aria-label="Mensajes">
            {messages.map((message) => (
              <article
                className={message.author === "Victor" ? "message message--victor" : "message message--jarvis"}
                key={message.id}
              >
                <strong>{message.author}</strong>
                <p>{message.text}</p>
              </article>
            ))}
          </div>

          {error ? (
            <div className="settings-feedback settings-feedback--error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="suggested-prompts" aria-label="Sugerencias">
            {followUps.map((prompt) => (
              <button
                className="filter-chip"
                disabled={sending}
                key={prompt}
                onClick={() => void submitMessage(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="chat-input-row" onSubmit={handleSubmit}>
            <input
              aria-label="Mensaje para JARVIS"
              disabled={sending}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Pregunta por prioridades, proyectos o memoria..."
              value={draft}
            />
            <Button disabled={sending} type="submit" variant="primary">
              {sending ? "Enviando" : "Enviar"}
            </Button>
          </form>
        </Card>

        <aside className="context-rail">
          <Card className="panel">
            <SectionHeader eyebrow="Modo" title={lastResponse ? modeLabels[lastResponse.mode] : "Sin consulta"} />
            <p>Ultima respuesta: {formatGeneratedAt(lastResponse?.generatedAt ?? null)}</p>
            <Badge tone={lastResponse ? "info" : "neutral"}>
              {lastResponse ? "Contexto D1" : "Esperando pregunta"}
            </Badge>
          </Card>

          <Card className="panel">
            <SectionHeader eyebrow="Fuentes usadas" title="Contexto" />
            <div className="chat-context-tags">
              {activeContext.length > 0 ? (
                activeContext.map(([key]) => (
                  <Badge key={key} tone="info">
                    {contextLabels[key]}
                  </Badge>
                ))
              ) : (
                <Badge tone="neutral">Sin fuentes aun</Badge>
              )}
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
}
