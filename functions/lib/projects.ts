import { allRows, firstRow, prepare } from "./db";
import { HttpError, readJson, success } from "./responses";
import type { D1Database, D1Value } from "./types";

const PROJECT_STATUSES = ["active", "planning", "paused", "completed", "archived"] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3", "P4"] as const;
const PROJECT_MUTATION_FIELDS = new Set(["name", "description", "status", "priority"]);

type ProjectStatus = (typeof PROJECT_STATUSES)[number];
type Priority = (typeof PRIORITIES)[number];

interface ProjectRow {
  id: string;
  name: string;
  objective: string | null;
  status: ProjectStatus;
  priority: Priority;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
}

interface ProjectDto {
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

const projectSelect = [
  "id",
  "name",
  "objective",
  "status",
  "priority",
  "created_at",
  "updated_at",
  "completed_at",
  "archived_at",
].join(", ");

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `project_${crypto.randomUUID()}`;
}

function toProjectDto(row: ProjectRow): ProjectDto {
  return {
    id: row.id,
    name: row.name,
    description: row.objective,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
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

function invalidRequired(field: string): never {
  throw new HttpError(`${field} is required`, 400);
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

function timestampForStatus(status: ProjectStatus, target: "completed" | "archived", current: string | null): string | null {
  if (status === target) {
    return current ?? nowIso();
  }

  return null;
}

function noStore(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

async function findProject(
  db: D1Database,
  ownerSubject: string,
  projectId: string,
): Promise<ProjectRow | null> {
  return firstRow<ProjectRow>(
    db,
    `SELECT ${projectSelect} FROM projects WHERE id = ? AND owner_subject = ?`,
    [projectId, ownerSubject],
  );
}

export async function listProjects(db: D1Database, ownerSubject: string): Promise<Response> {
  const rows = await allRows<ProjectRow>(
    db,
    `SELECT ${projectSelect}
     FROM projects
     WHERE owner_subject = ?
     ORDER BY updated_at DESC, id ASC`,
    [ownerSubject],
  );

  return success(rows.map(toProjectDto), { headers: noStore() });
}

export async function createProject(
  request: Request,
  db: D1Database,
  ownerSubject: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const payload = await readJson(request);
  assertKnownFields(payload, PROJECT_MUTATION_FIELDS);

  const createdAt = nowIso();
  const status = enumField(payload, "status", PROJECT_STATUSES, "active") ?? "active";
  const project: ProjectRow = {
    id: newId(),
    name: stringField(payload, "name", { maxLength: 120, required: true }) ?? invalidRequired("name"),
    objective: stringField(payload, "description", { maxLength: 800 }) ?? null,
    status,
    priority: enumField(payload, "priority", PRIORITIES, "P2") ?? "P2",
    created_at: createdAt,
    updated_at: createdAt,
    completed_at: status === "completed" ? createdAt : null,
    archived_at: status === "archived" ? createdAt : null,
  };

  await prepare(
    db,
    `INSERT INTO projects
      (id, owner_subject, name, objective, status, priority, created_at, updated_at, completed_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      project.id,
      ownerSubject,
      project.name,
      project.objective,
      project.status,
      project.priority,
      project.created_at,
      project.updated_at,
      project.completed_at,
      project.archived_at,
    ],
  ).run();

  return success(toProjectDto(project), { status: 201, headers: noStore() });
}

export async function updateProject(
  request: Request,
  db: D1Database,
  ownerSubject: string,
  projectId: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const existing = await findProject(db, ownerSubject, projectId);

  if (!existing) {
    throw new HttpError("Not found", 404);
  }

  const payload = await readJson(request);
  assertKnownFields(payload, PROJECT_MUTATION_FIELDS);

  const updates: string[] = [];
  const values: D1Value[] = [];

  const name = stringField(payload, "name", { maxLength: 120, required: true });
  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name);
  }

  const description = stringField(payload, "description", { maxLength: 800 });
  if (description !== undefined) {
    updates.push("objective = ?");
    values.push(description);
  }

  const status = enumField(payload, "status", PROJECT_STATUSES);
  const nextStatus = status ?? existing.status;
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
    updates.push("completed_at = ?");
    values.push(timestampForStatus(nextStatus, "completed", existing.completed_at));
    updates.push("archived_at = ?");
    values.push(timestampForStatus(nextStatus, "archived", existing.archived_at));
  }

  const priority = enumField(payload, "priority", PRIORITIES);
  if (priority !== undefined) {
    updates.push("priority = ?");
    values.push(priority);
  }

  if (updates.length === 0) {
    throw new HttpError("No changes provided", 400);
  }

  const updatedAt = nowIso();
  updates.push("updated_at = ?");
  values.push(updatedAt, projectId, ownerSubject);

  await prepare(
    db,
    `UPDATE projects SET ${updates.join(", ")} WHERE id = ? AND owner_subject = ?`,
    values,
  ).run();

  const updated = await findProject(db, ownerSubject, projectId);

  if (!updated) {
    throw new HttpError("Not found", 404);
  }

  return success(toProjectDto(updated), { headers: noStore() });
}
