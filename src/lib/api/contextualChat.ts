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

export interface ContextualChatResponse {
  answer: string;
  generatedAt: string;
  mode: ChatMode;
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
