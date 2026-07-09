export type ChatMode =
  | "priorities"
  | "projects"
  | "tasks"
  | "memory"
  | "decisions"
  | "persons"
  | "reminders"
  | "overview";

export interface UsedContext {
  briefing: boolean;
  projects: boolean;
  tasks: boolean;
  memory: boolean;
  decisions: boolean;
  persons: boolean;
  reminders: boolean;
  links: boolean;
}

export interface ContextStats {
  projects: number;
  tasks: number;
  memory: number;
  decisions: number;
  persons: number;
  reminders: number;
}

export type ActionProposalType =
  | "create_task"
  | "save_memory"
  | "create_decision"
  | "create_reminder"
  | "update_task_status";

export type ProposalConfidence = "low" | "medium" | "high";

export interface ActionProposal {
  id: string;
  type: ActionProposalType;
  title: string;
  summary: string;
  confidence: ProposalConfidence;
  requiresApproval: true;
  status: "preview_only";
  payload: Record<string, string | null>;
  warnings: string[];
}

export interface ActionExecutionEntity {
  id: string;
  kind: "task" | "memory" | "decision" | "reminder";
  title: string;
}

export interface ActionExecutionResult {
  actionId: string;
  type: ActionProposalType;
  status: "executed";
  entity: ActionExecutionEntity;
  warnings: string[];
  executedAt: string;
}

export interface ContextualChatResponse {
  actionProposals: ActionProposal[];
  answer: string;
  contextStats: ContextStats;
  generatedAt: string;
  latencyMs: number;
  mode: ChatMode;
  model: string;
  requestId: string;
  suggestedFollowUps: string[];
  usedContext: UsedContext;
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export class ContextualChatError extends Error {
  code: string;
  status: number;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ContextualChatError";
    this.status = status;
    this.code = code;
  }
}

export function isContextualChatError(error: unknown): error is ContextualChatError {
  return error instanceof ContextualChatError;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!payload || payload.ok !== true) {
    const code = payload?.error ?? "CHAT_REQUEST_FAILED";
    throw new ContextualChatError(code, response.status, code);
  }

  return payload.data;
}

export async function sendContextualChatMessage(message: string): Promise<ContextualChatResponse> {
  const response = await fetch("/api/chat/context", {
    body: JSON.stringify({ message }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponse<ContextualChatResponse>(response);
}

export async function executeApprovedActionProposal(
  proposal: ActionProposal,
  sourceRequestId: string | null,
): Promise<ActionExecutionResult> {
  const response = await fetch("/api/actions/execute", {
    body: JSON.stringify({
      approval: {
        confirmed: true,
        sourceRequestId,
      },
      proposal,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseResponse<ActionExecutionResult>(response);
}
