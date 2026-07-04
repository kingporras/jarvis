import type { Priority, ProjectStatus, TaskStatus } from "../../types/jarvis";

export interface RealProject {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
}

export interface RealTask {
  id: string;
  projectId: string | null;
  projectName: string | null;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: Priority;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ProjectPayload {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: Priority;
}

export interface TaskPayload {
  title?: string;
  notes?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  projectId?: string | null;
  dueAt?: string | null;
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

export function fetchProjects(): Promise<RealProject[]> {
  return apiFetch<RealProject[]>("/api/projects");
}

export function createProject(payload: Required<Pick<ProjectPayload, "name">> & ProjectPayload): Promise<RealProject> {
  return apiFetch<RealProject>("/api/projects", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export function updateProject(projectId: string, payload: ProjectPayload): Promise<RealProject> {
  return apiFetch<RealProject>(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    body: jsonBody(payload),
  });
}

export function fetchTasks(): Promise<RealTask[]> {
  return apiFetch<RealTask[]>("/api/tasks");
}

export function createTask(payload: Required<Pick<TaskPayload, "title">> & TaskPayload): Promise<RealTask> {
  return apiFetch<RealTask>("/api/tasks", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export function updateTask(taskId: string, payload: TaskPayload): Promise<RealTask> {
  return apiFetch<RealTask>(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: jsonBody(payload),
  });
}
