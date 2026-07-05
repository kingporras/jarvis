import type { Priority } from "../../types/jarvis";

export type RealMemoryType =
  | "personal"
  | "preference"
  | "project"
  | "decision"
  | "task_context"
  | "person"
  | "knowledge"
  | "system";

export type RealMemoryStatus = "active" | "archived";
export type MemorySource = "manual";

export interface RealMemory {
  id: string;
  title: string;
  content: string;
  type: RealMemoryType;
  priority: Priority;
  status: RealMemoryStatus;
  source: MemorySource;
  confidence: number | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface MemoryPayload {
  title?: string;
  content?: string;
  type?: RealMemoryType;
  priority?: Priority;
  status?: RealMemoryStatus;
  source?: MemorySource;
  confidence?: number;
  expiresAt?: string | null;
}

export interface MemoryFilters {
  type?: RealMemoryType;
  priority?: Priority;
  status?: RealMemoryStatus;
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

function memoryPath(filters: MemoryFilters): string {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.type) {
    params.set("type", filters.type);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }

  const query = params.toString();
  return query ? `/api/memory?${query}` : "/api/memory";
}

export function fetchMemories(filters: MemoryFilters = {}): Promise<RealMemory[]> {
  return apiFetch<RealMemory[]>(memoryPath(filters));
}

export function createMemory(
  payload: Required<Pick<MemoryPayload, "title" | "content" | "type" | "priority">> & MemoryPayload,
): Promise<RealMemory> {
  return apiFetch<RealMemory>("/api/memory", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export function updateMemory(memoryId: string, payload: MemoryPayload): Promise<RealMemory> {
  return apiFetch<RealMemory>(`/api/memory/${encodeURIComponent(memoryId)}`, {
    method: "PATCH",
    body: jsonBody(payload),
  });
}
