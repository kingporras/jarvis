import { useEffect, useRef, useState, type FormEvent } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import {
  executeApprovedActionProposal,
  isContextualChatError,
  sendContextualChatMessage,
  type ActionExecutionResult,
  type ActionProposal,
  type ChatMode,
  type ContextualChatResponse,
  type ContextStats,
  type UsedContext,
} from "../lib/api/contextualChat";

type ChatAuthor = "Victor" | "JARVIS";

interface LocalMessage {
  actionProposals?: ActionProposal[];
  author: ChatAuthor;
  id: string;
  sourceRequestId?: string;
  text: string;
}

type ProposalUiStatus =
  | "preview_only"
  | "confirming"
  | "executing"
  | "executed"
  | "failed"
  | "needs_clarification";

interface ProposalExecutionState {
  error?: string;
  result?: ActionExecutionResult;
  status: ProposalUiStatus;
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

const MAX_MESSAGE_LENGTH = 2_000;

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

const contextStatLabels: Record<keyof ContextStats, string> = {
  projects: "Proyectos",
  tasks: "Tareas",
  memory: "Memoria",
  decisions: "Decisiones",
  persons: "Personas",
  reminders: "Recordatorios",
};

const proposalTypeLabels: Record<ActionProposal["type"], string> = {
  create_task: "Crear tarea",
  save_memory: "Guardar memoria",
  create_decision: "Crear decision",
  create_reminder: "Crear recordatorio",
  update_task_status: "Actualizar tarea",
};

const proposalConfidenceLabels: Record<ActionProposal["confidence"], string> = {
  low: "Confianza baja",
  medium: "Confianza media",
  high: "Confianza alta",
};

const proposalStatusLabels: Record<ProposalUiStatus, string> = {
  preview_only: "Vista previa",
  confirming: "Confirmando",
  executing: "Ejecutando",
  executed: "Ejecutada",
  failed: "Fallida",
  needs_clarification: "Necesita aclaracion",
};

const proposalPayloadLabels: Record<string, string> = {
  content: "Contenido",
  context: "Contexto",
  dueAt: "Fecha limite",
  newStatus: "Nuevo estado",
  notes: "Notas",
  options: "Opciones",
  priority: "Prioridad",
  projectHint: "Proyecto",
  reason: "Motivo",
  reviewDueAt: "Revision",
  taskHint: "Tarea",
  title: "Titulo",
  type: "Tipo",
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

    if (error.code === "AI_REQUEST_FAILED" || error.code === "AI_EMPTY_RESPONSE" || error.status === 502) {
      return "OpenAI no pudo responder. Revisa modelo, clave o disponibilidad del servicio.";
    }

    if (error.status === 401 || error.status === 403) {
      return "La sesion privada no esta validada para este chat.";
    }

    if (error.status === 400) {
      if (error.code === "message is too long") {
        return `El mensaje supera ${MAX_MESSAGE_LENGTH.toLocaleString("es-ES")} caracteres. Acortalo y vuelve a enviarlo.`;
      }

      if (error.code === "message is required") {
        return "Escribe una pregunta para JARVIS.";
      }

      return "El mensaje no es valido para este chat.";
    }
  }

  return "No se pudo generar la respuesta. Vuelve a intentarlo.";
}

function actionExecutionErrorMessage(error: unknown): string {
  if (isContextualChatError(error)) {
    if (error.code === "TARGET_AMBIGUOUS" || error.status === 409) {
      return "JARVIS necesita aclaracion: hay mas de una coincidencia posible.";
    }

    if (error.code === "TARGET_NOT_FOUND" || error.status === 404) {
      return "No encontre el objetivo propio para ejecutar esta accion.";
    }

    if (
      error.code === "APPROVAL_REQUIRED" ||
      error.code === "INVALID_ACTION_PROPOSAL" ||
      error.code === "INVALID_PAYLOAD" ||
      error.code === "INVALID_ACTION_TYPE" ||
      error.status === 400
    ) {
      return "La propuesta ya no es valida para ejecucion.";
    }

    if (error.status === 401 || error.status === 403) {
      return "La sesion privada no esta validada para ejecutar acciones.";
    }
  }

  return "No se pudo ejecutar la accion aprobada.";
}

function formatLatency(value: number | null): string {
  if (typeof value !== "number") {
    return "Sin respuesta";
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(value / 1000).toFixed(1)} s`;
}

function formatProposalPayloadValue(key: string, value: string | null): string {
  if (!value) {
    return "Sin definir";
  }

  if (key.endsWith("At")) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    }
  }

  return value;
}

function proposalPayloadLabel(key: string): string {
  return proposalPayloadLabels[key] ?? key.replace(/([A-Z])/g, " $1").toLowerCase();
}

function proposalStatusTone(status: ProposalUiStatus): "neutral" | "info" | "success" | "warning" {
  if (status === "executed") {
    return "success";
  }

  if (status === "failed" || status === "needs_clarification") {
    return "warning";
  }

  if (status === "confirming") {
    return "info";
  }

  return "warning";
}

function ActionProposalPreview({
  disabled,
  onCancel,
  onConfirm,
  onStartConfirm,
  proposal,
  sourceRequestId,
  state,
}: {
  disabled: boolean;
  onCancel: (proposalId: string) => void;
  onConfirm: (proposal: ActionProposal, sourceRequestId: string | null) => void;
  onStartConfirm: (proposalId: string) => void;
  proposal: ActionProposal;
  sourceRequestId: string | null;
  state: ProposalExecutionState;
}) {
  const status = state.status;

  return (
    <article className="action-proposal-card">
      <div className="action-proposal-card__header">
        <div>
          <span>{proposalTypeLabels[proposal.type]}</span>
          <h3>{proposal.title}</h3>
        </div>
        <div className="action-proposal-card__badges">
          <Badge tone={proposalStatusTone(status)}>{proposalStatusLabels[status]}</Badge>
          <Badge tone={proposal.confidence === "high" ? "success" : "info"}>
            {proposalConfidenceLabels[proposal.confidence]}
          </Badge>
        </div>
      </div>

      <p>{proposal.summary}</p>

      <dl className="action-proposal-card__payload">
        {Object.entries(proposal.payload).map(([key, value]) => (
          <div key={key}>
            <dt>{proposalPayloadLabel(key)}</dt>
            <dd>{formatProposalPayloadValue(key, value)}</dd>
          </div>
        ))}
      </dl>

      {proposal.warnings.length > 0 ? (
        <ul className="action-proposal-card__warnings" aria-label="Avisos de la propuesta">
          {proposal.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {status === "confirming" ? (
        <div className="action-proposal-card__confirmation" role="alert">
          <strong>Esto escribirá datos reales en JARVIS</strong>
          <p>{proposal.summary}</p>
          <div className="action-proposal-card__actions">
            <Button
              disabled={disabled}
              onClick={() => onConfirm(proposal, sourceRequestId)}
              type="button"
              variant="primary"
            >
              Confirmar ejecución
            </Button>
            <Button disabled={disabled} onClick={() => onCancel(proposal.id)} type="button" variant="ghost">
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {state.result ? (
        <div className="action-proposal-card__result" role="status">
          <strong>{state.result.entity.title}</strong>
          <span>
            {state.result.entity.kind} creado/actualizado · {formatGeneratedAt(state.result.executedAt)}
          </span>
        </div>
      ) : null}

      {state.error ? (
        <div className="action-proposal-card__error" role="alert">
          {state.error}
        </div>
      ) : null}

      {status === "preview_only" || status === "failed" || status === "needs_clarification" ? (
        <Button disabled={disabled} onClick={() => onStartConfirm(proposal.id)} type="button" variant="secondary">
          Aprobar y ejecutar
        </Button>
      ) : null}

      {status === "executing" ? (
        <Button disabled type="button" variant="ghost">
          Ejecutando accion...
        </Button>
      ) : null}
    </article>
  );
}

export function ChatPage() {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
  const [proposalStates, setProposalStates] = useState<Record<string, ProposalExecutionState>>({});
  const [sending, setSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<ContextualChatResponse | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const followUps = lastResponse?.suggestedFollowUps.length
    ? lastResponse.suggestedFollowUps
    : initialFollowUps;
  const activeContext = lastResponse
    ? (Object.entries(lastResponse.usedContext) as [keyof UsedContext, boolean][]).filter(
        ([, used]) => used,
      )
    : [];
  const proposalExecuting = Object.values(proposalStates).some((state) => state.status === "executing");

  useEffect(() => {
    if (messages.length === initialMessages.length && !error) {
      return;
    }

    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: "nearest" });
    });
  }, [error, messages.length]);

  async function submitMessage(rawMessage: string): Promise<void> {
    const message = rawMessage.trim();

    if (sending) {
      return;
    }

    if (!message) {
      setError("Escribe una pregunta para JARVIS.");
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      setError(`El mensaje supera ${MAX_MESSAGE_LENGTH.toLocaleString("es-ES")} caracteres. Acortalo y vuelve a enviarlo.`);
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
          actionProposals: response.actionProposals,
          author: "JARVIS",
          id: newMessageId("JARVIS"),
          sourceRequestId: response.requestId,
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

  function proposalState(proposalId: string): ProposalExecutionState {
    return proposalStates[proposalId] ?? { status: "preview_only" };
  }

  function startProposalConfirmation(proposalId: string): void {
    if (proposalExecuting) {
      return;
    }

    setProposalStates((currentStates) => ({
      ...currentStates,
      [proposalId]: { status: "confirming" },
    }));
  }

  function cancelProposalConfirmation(proposalId: string): void {
    setProposalStates((currentStates) => ({
      ...currentStates,
      [proposalId]: { status: "preview_only" },
    }));
  }

  async function confirmProposalExecution(
    proposal: ActionProposal,
    sourceRequestId: string | null,
  ): Promise<void> {
    if (proposalExecuting) {
      return;
    }

    setProposalStates((currentStates) => ({
      ...currentStates,
      [proposal.id]: { status: "executing" },
    }));

    try {
      const result = await executeApprovedActionProposal(proposal, sourceRequestId);
      setProposalStates((currentStates) => ({
        ...currentStates,
        [proposal.id]: { result, status: "executed" },
      }));
    } catch (caughtError) {
      const status =
        isContextualChatError(caughtError) && caughtError.status === 409
          ? "needs_clarification"
          : "failed";
      setProposalStates((currentStates) => ({
        ...currentStates,
        [proposal.id]: {
          error: actionExecutionErrorMessage(caughtError),
          status,
        },
      }));
    }
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
                {message.author === "JARVIS" && message.actionProposals?.length ? (
                  <div className="action-proposal-list" aria-label="Propuestas de accion en vista previa">
                    <div className="action-proposal-list__notice">
                      Vista previa: todavía no se ejecuta ninguna acción.
                    </div>
                    {message.actionProposals.map((proposal) => (
                      <ActionProposalPreview
                        disabled={proposalExecuting}
                        key={proposal.id}
                        onCancel={cancelProposalConfirmation}
                        onConfirm={(selectedProposal, sourceRequestId) =>
                          void confirmProposalExecution(selectedProposal, sourceRequestId)
                        }
                        onStartConfirm={startProposalConfirmation}
                        proposal={proposal}
                        sourceRequestId={message.sourceRequestId ?? null}
                        state={proposalState(proposal.id)}
                      />
                    ))}
                  </div>
                ) : null}
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

          <form className="chat-input-row" onSubmit={handleSubmit} ref={formRef}>
            <input
              aria-label="Mensaje para JARVIS"
              aria-describedby="chat-input-limit"
              disabled={sending}
              maxLength={MAX_MESSAGE_LENGTH + 200}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Pregunta por prioridades, proyectos o memoria..."
              value={draft}
            />
            <Button disabled={sending} type="submit" variant="primary">
              {sending ? "Enviando" : "Enviar"}
            </Button>
            <span className="chat-input-row__limit" id="chat-input-limit">
              {draft.trim().length}/{MAX_MESSAGE_LENGTH}
            </span>
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
            <SectionHeader eyebrow="Observabilidad" title="Respuesta" />
            <div className="chat-meta-grid">
              <div>
                <span>Modelo</span>
                <strong>{lastResponse?.model ?? "Sin respuesta"}</strong>
              </div>
              <div>
                <span>Latencia</span>
                <strong>{formatLatency(lastResponse?.latencyMs ?? null)}</strong>
              </div>
              <div>
                <span>Request</span>
                <strong>{lastResponse?.requestId ?? "Sin respuesta"}</strong>
              </div>
            </div>
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

          <Card className="panel">
            <SectionHeader eyebrow="Contexto" title="Registros usados" />
            <div className="chat-stat-grid">
              {lastResponse ? (
                (Object.entries(lastResponse.contextStats) as [keyof ContextStats, number][]).map(
                  ([key, value]) => (
                    <div key={key}>
                      <span>{contextStatLabels[key]}</span>
                      <strong>{value}</strong>
                    </div>
                  ),
                )
              ) : (
                <p>Sin consulta todavia.</p>
              )}
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
}
