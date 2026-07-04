import { allRows, firstRow, prepare } from "./db";
import { HttpError, readJson, success } from "./responses";
import type { D1Database, D1Value } from "./types";

const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3", "P4"] as const;
const TASK_MUTATION_FIELDS = new Set(["title", "notes", "status", "priority", "projectId", "dueAt"]);

type TaskStatus = (typeof TASK_STATUSES)[number];
type Priority = (typeof PRIORITIES)[number];

interface TaskRow {
  id: string;
  project_id: string | null;
  project_name: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface TaskDto {
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

const taskSelect = [
  "tasks.id",
  "tasks.project_id",
  "projects.name AS project_name",
  "tasks.title",
  "tasks.description",
  "tasks.status",
  "tasks.priority",
  "tasks.due_date",
  "tasks.created_at",
  "tasks.updated_at",
  "tasks.completed_at",
].join(", ");

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `task_${crypto.randomUUID()}`;
}

function toTaskDto(row: TaskRow): TaskDto {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    title: row.title,
    notes: row.description,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function assertSameOriginMutation(request: Request): void {
  const origin = request.headers.get("Origin");

  if (origin && origin !== new URL(request.url).origin) {
    throw new HttpError("Forbidden", 403);
  }
}

function assertJsonRequest(request: Request): void {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError("Content-Type must be application/json", 400);
  }
}

function assertKnownFields(payload: Record<string, unknown>, allowed: Set<string>): void {
  const unknownField = Object.keys(payload).find((field) => !allowed.has(field));

  if (unknownField) {
    throw new HttpError(`Unknown field: ${unknownField}`, 400);
  }
}

function invalidRequired(field: string): never {
  throw new HttpError(`${field} is required`, 400);
}

function stringField(
  payload: Record<string, unknown>,
  field: string,
  options: { maxLength: number; required?: boolean } = { maxLength: 200 },
): string | null | undefined {
  const value = payload[field];

  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return options.required ? invalidRequired(field) : null;
  }

  if (typeof value !== "string") {
    throw new HttpError(`${field} must be a string`, 400);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return options.required ? invalidRequired(field) : null;
  }

  if (trimmed.length > options.maxLength) {
    throw new HttpError(`${field} is too long`, 400);
  }

  return trimmed;
}

function enumField<TValue extends string>(
  payload: Record<string, unknown>,
  field: string,
  values: readonly TValue[],
  fallback?: TValue,
): TValue | undefined {
  const value = payload[field];

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string" || !values.includes(value as TValue)) {
    throw new HttpError(`${field} is invalid`, 400);
  }

  return value as TValue;
}

function nullableProjectId(payload: Record<string, unknown>, required = false): string | null | undefined {
  const value = payload.projectId;

  if (value === undefined) {
    return required ? null : undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > 140) {
    throw new HttpError("projectId is invalid", 400);
  }

  return value.trim();
}

function dueAtField(payload: Record<string, unknown>): string | null | undefined {
  const value = payload.dueAt;

  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || value.trim().length > 40) {
    throw new HttpError("dueAt is invalid", 400);
  }

  return value.trim();
}

function noStore(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

async function assertOwnedProject(
  db: D1Database,
  ownerSubject: string,
  projectId: string | null,
): Promise<void> {
  if (!projectId) {
    return;
  }

  const project = await firstRow<{ id: string }>(
    db,
    "SELECT id FROM projects WHERE id = ? AND owner_subject = ?",
    [projectId, ownerSubject],
  );

  if (!project) {
    throw new HttpError("Not found", 404);
  }
}

async function findTask(db: D1Database, ownerSubject: string, taskId: string): Promise<TaskRow | null> {
  return firstRow<TaskRow>(
    db,
    `SELECT ${taskSelect}
     FROM tasks
     LEFT JOIN projects
       ON projects.id = tasks.project_id
      AND projects.owner_subject = tasks.owner_subject
     WHERE tasks.id = ? AND tasks.owner_subject = ?`,
    [taskId, ownerSubject],
  );
}

export async function listTasks(db: D1Database, ownerSubject: string): Promise<Response> {
  const rows = await allRows<TaskRow>(
    db,
    `SELECT ${taskSelect}
     FROM tasks
     LEFT JOIN projects
       ON projects.id = tasks.project_id
      AND projects.owner_subject = tasks.owner_subject
     WHERE tasks.owner_subject = ?
     ORDER BY tasks.updated_at DESC, tasks.id ASC`,
    [ownerSubject],
  );

  return success(rows.map(toTaskDto), { headers: noStore() });
}

export async function createTask(
  request: Request,
  db: D1Database,
  ownerSubject: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const payload = await readJson(request);
  assertKnownFields(payload, TASK_MUTATION_FIELDS);

  const projectId = nullableProjectId(payload, true) ?? null;
  await assertOwnedProject(db, ownerSubject, projectId);

  const createdAt = nowIso();
  const status = enumField(payload, "status", TASK_STATUSES, "todo") ?? "todo";
  const task = {
    id: newId(),
    projectId,
    title: stringField(payload, "title", { maxLength: 160, required: true }) ?? invalidRequired("title"),
    notes: stringField(payload, "notes", { maxLength: 1000 }) ?? null,
    status,
    priority: enumField(payload, "priority", PRIORITIES, "P2") ?? "P2",
    dueAt: dueAtField(payload) ?? null,
    createdAt,
    updatedAt: createdAt,
    completedAt: status === "done" ? createdAt : null,
  };

  await prepare(
    db,
    `INSERT INTO tasks
      (id, owner_subject, project_id, title, description, status, priority, due_date, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      ownerSubject,
      task.projectId,
      task.title,
      task.notes,
      task.status,
      task.priority,
      task.dueAt,
      task.createdAt,
      task.updatedAt,
      task.completedAt,
    ],
  ).run();

  const created = await findTask(db, ownerSubject, task.id);

  if (!created) {
    throw new HttpError("Internal server error", 500);
  }

  return success(toTaskDto(created), { status: 201, headers: noStore() });
}

export async function updateTask(
  request: Request,
  db: D1Database,
  ownerSubject: string,
  taskId: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const existing = await findTask(db, ownerSubject, taskId);

  if (!existing) {
    throw new HttpError("Not found", 404);
  }

  const payload = await readJson(request);
  assertKnownFields(payload, TASK_MUTATION_FIELDS);

  const updates: string[] = [];
  const values: D1Value[] = [];

  const title = stringField(payload, "title", { maxLength: 160, required: true });
  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }

  const notes = stringField(payload, "notes", { maxLength: 1000 });
  if (notes !== undefined) {
    updates.push("description = ?");
    values.push(notes);
  }

  const projectId = nullableProjectId(payload);
  if (projectId !== undefined) {
    await assertOwnedProject(db, ownerSubject, projectId);
    updates.push("project_id = ?");
    values.push(projectId);
  }

  const status = enumField(payload, "status", TASK_STATUSES);
  const nextStatus = status ?? existing.status;
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
    updates.push("completed_at = ?");
    values.push(nextStatus === "done" ? existing.completed_at ?? nowIso() : null);
  }

  const priority = enumField(payload, "priority", PRIORITIES);
  if (priority !== undefined) {
    updates.push("priority = ?");
    values.push(priority);
  }

  const dueAt = dueAtField(payload);
  if (dueAt !== undefined) {
    updates.push("due_date = ?");
    values.push(dueAt);
  }

  if (updates.length === 0) {
    throw new HttpError("No changes provided", 400);
  }

  const updatedAt = nowIso();
  updates.push("updated_at = ?");
  values.push(updatedAt, taskId, ownerSubject);

  await prepare(
    db,
    `UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND owner_subject = ?`,
    values,
  ).run();

  const updated = await findTask(db, ownerSubject, taskId);

  if (!updated) {
    throw new HttpError("Not found", 404);
  }

  return success(toTaskDto(updated), { headers: noStore() });
}
