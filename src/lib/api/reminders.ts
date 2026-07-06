import type { Priority } from "../../types/jarvis";

export type RealReminderStatus = "pending" | "completed" | "dismissed";
export type ReminderScope = "upcoming" | "overdue" | "all";

export interface RealReminder {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string;
  priority: Priority;
  status: RealReminderStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  dismissedAt: string | null;
}

export interface ReminderPayload {
  title?: string;
  notes?: string | null;
  dueAt?: string;
  priority?: Priority;
  status?: RealReminderStatus;
}

export interface ReminderFilters {
  status?: RealReminderStatus;
  priority?: Priority;
  scope?: ReminderScope;
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

function remindersPath(filters: ReminderFilters): string {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.priority) {
    params.set("priority", filters.priority);
  }

  if (filters.scope) {
    params.set("scope", filters.scope);
  }

  const query = params.toString();
  return query ? `/api/reminders?${query}` : "/api/reminders";
}

export function fetchReminders(filters: ReminderFilters = {}): Promise<RealReminder[]> {
  return apiFetch<RealReminder[]>(remindersPath(filters));
}

export function createReminder(
  payload: Required<Pick<ReminderPayload, "title" | "dueAt" | "priority">> & ReminderPayload,
): Promise<RealReminder> {
  return apiFetch<RealReminder>("/api/reminders", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export function updateReminder(reminderId: string, payload: ReminderPayload): Promise<RealReminder> {
  return apiFetch<RealReminder>(`/api/reminders/${encodeURIComponent(reminderId)}`, {
    method: "PATCH",
    body: jsonBody(payload),
  });
}
