import type { Priority } from "../../types/jarvis";

export type RealDecisionStatus = "open" | "decided" | "superseded" | "archived";

export interface RealDecision {
  id: string;
  projectId: string | null;
  projectName: string | null;
  title: string;
  context: string | null;
  outcome: string | null;
  rationale: string | null;
  status: RealDecisionStatus;
  priority: Priority;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface DecisionPayload {
  title?: string;
  context?: string | null;
  outcome?: string | null;
  rationale?: string | null;
  status?: RealDecisionStatus;
  priority?: Priority;
  projectId?: string | null;
}

export interface DecisionFilters {
  status?: RealDecisionStatus;
  priority?: Priority;
  projectId?: string;
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!payload || payload.ok !== true) {
    throw new Error(payload?.error ?? "No se pudo completar la operacion.");
  }

  return payload.data;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  return parseResponse<T>(response);
}

function jsonBody(payload: object): string {
  return JSON.stringify(payload);
}

function decisionsPath(filters: DecisionFilters): string {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }

  if (filters.projectId) {
    params.set("projectId", filters.projectId);
  }

  const query = params.toString();
  return query ? `/api/decisions?${query}` : "/api/decisions";
}

export function fetchDecisions(filters: DecisionFilters = {}): Promise<RealDecision[]> {
  return apiFetch<RealDecision[]>(decisionsPath(filters));
}

export function createDecision(
  payload: Required<Pick<DecisionPayload, "title" | "status" | "priority">> & DecisionPayload,
): Promise<RealDecision> {
  return apiFetch<RealDecision>("/api/decisions", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export function updateDecision(decisionId: string, payload: DecisionPayload): Promise<RealDecision> {
  return apiFetch<RealDecision>(`/api/decisions/${encodeURIComponent(decisionId)}`, {
    method: "PATCH",
    body: jsonBody(payload),
  });
}
