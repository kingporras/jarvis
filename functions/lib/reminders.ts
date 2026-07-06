import { allRows, firstRow, prepare } from "./db";
import { HttpError, readJson, success } from "./responses";
import type { D1Database, D1Value } from "./types";

const REMINDER_STATUSES = ["pending", "completed", "dismissed"] as const;
const REMINDER_SCOPES = ["upcoming", "overdue", "all"] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3", "P4"] as const;
const REMINDER_CREATE_FIELDS = new Set(["title", "notes", "dueAt", "priority"]);
const REMINDER_MUTATION_FIELDS = new Set(["title", "notes", "dueAt", "priority", "status"]);

type ReminderStatus = (typeof REMINDER_STATUSES)[number];
type Priority = (typeof PRIORITIES)[number];

interface ReminderRow {
  id: string;
  title: string;
  notes: string | null;
  remind_at: string | null;
  due_at: string | null;
  priority: Priority;
  status: ReminderStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  dismissed_at: string | null;
}

interface ReminderDto {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string;
  priority: Priority;
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  dismissedAt: string | null;
}

const reminderSelect = [
  "id",
  "title",
  "notes",
  "remind_at",
  "due_at",
  "priority",
  "status",
  "created_at",
  "updated_at",
  "completed_at",
  "dismissed_at",
].join(", ");

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `reminder_${crypto.randomUUID()}`;
}

function toReminderDto(row: ReminderRow): ReminderDto {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    dueAt: row.due_at ?? row.remind_at ?? "",
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    dismissedAt: row.dismissed_at,
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

function filterParam<TValue extends string>(
  url: URL,
  name: string,
  values: readonly TValue[],
): TValue | null {
  const value = url.searchParams.get(name);

  if (!value) {
    return null;
  }

  if (!values.includes(value as TValue)) {
    throw new HttpError(`${name} is invalid`, 400);
  }

  return value as TValue;
}

function isoUtcField(
  payload: Record<string, unknown>,
  field: string,
  options: { required?: boolean } = {},
): string | undefined {
  const value = payload[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    return options.required ? invalidRequired(field) : undefined;
  }

  const trimmed = value.trim();
  const parsed = new Date(trimmed);

  if (!Number.isFinite(parsed.getTime()) || !trimmed.endsWith("Z")) {
    throw new HttpError(`${field} must be an ISO UTC timestamp`, 400);
  }

  return parsed.toISOString();
}

function completedAtForStatus(status: ReminderStatus, current: string | null): string | null {
  return status === "completed" ? current ?? nowIso() : null;
}

function dismissedAtForStatus(status: ReminderStatus, current: string | null): string | null {
  return status === "dismissed" ? current ?? nowIso() : null;
}

function noStore(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

async function findReminder(
  db: D1Database,
  ownerSubject: string,
  reminderId: string,
): Promise<ReminderRow | null> {
  return firstRow<ReminderRow>(
    db,
    `SELECT ${reminderSelect} FROM reminders WHERE id = ? AND owner_subject = ?`,
    [reminderId, ownerSubject],
  );
}

export async function listReminders(
  request: Request,
  db: D1Database,
  ownerSubject: string,
): Promise<Response> {
  const url = new URL(request.url);
  const clauses = ["owner_subject = ?"];
  const values: D1Value[] = [ownerSubject];
  const now = nowIso();
  const status = filterParam(url, "status", REMINDER_STATUSES);
  const priority = filterParam(url, "priority", PRIORITIES);
  const scope = filterParam(url, "scope", REMINDER_SCOPES);

  if (status) {
    clauses.push("status = ?");
    values.push(status);
  }

  if (priority) {
    clauses.push("priority = ?");
    values.push(priority);
  }

  if (scope === "upcoming") {
    clauses.push("status = ?");
    values.push("pending");
    clauses.push("due_at >= ?");
    values.push(now);
  }

  if (scope === "overdue") {
    clauses.push("status = ?");
    values.push("pending");
    clauses.push("due_at < ?");
    values.push(now);
  }

  const rows = await allRows<ReminderRow>(
    db,
    `SELECT ${reminderSelect}
     FROM reminders
     WHERE ${clauses.join(" AND ")}
     ORDER BY
       CASE
         WHEN status = 'pending' AND due_at < ? THEN 0
         WHEN status = 'pending' THEN 1
         ELSE 2
       END,
       CASE WHEN status = 'pending' THEN due_at END ASC,
       CASE WHEN status != 'pending' THEN updated_at END DESC,
       id ASC`,
    [...values, now],
  );

  return success(rows.map(toReminderDto), { headers: noStore() });
}

export async function createReminder(
  request: Request,
  db: D1Database,
  ownerSubject: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const payload = await readJson(request);
  assertKnownFields(payload, REMINDER_CREATE_FIELDS);

  const createdAt = nowIso();
  const row: ReminderRow = {
    id: newId(),
    title: stringField(payload, "title", { maxLength: 180, required: true }) ?? invalidRequired("title"),
    notes: stringField(payload, "notes", { maxLength: 4000 }) ?? null,
    remind_at: null,
    due_at: isoUtcField(payload, "dueAt", { required: true }) ?? invalidRequired("dueAt"),
    priority: enumField(payload, "priority", PRIORITIES, "P2") ?? "P2",
    status: "pending",
    created_at: createdAt,
    updated_at: createdAt,
    completed_at: null,
    dismissed_at: null,
  };

  await prepare(
    db,
    `INSERT INTO reminders
      (id, owner_subject, title, notes, remind_at, due_at, priority, status, created_at, updated_at, completed_at, dismissed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      ownerSubject,
      row.title,
      row.notes,
      row.remind_at,
      row.due_at,
      row.priority,
      row.status,
      row.created_at,
      row.updated_at,
      row.completed_at,
      row.dismissed_at,
    ],
  ).run();

  return success(toReminderDto(row), { status: 201, headers: noStore() });
}

export async function updateReminder(
  request: Request,
  db: D1Database,
  ownerSubject: string,
  reminderId: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const existing = await findReminder(db, ownerSubject, reminderId);

  if (!existing) {
    throw new HttpError("Not found", 404);
  }

  const payload = await readJson(request);
  assertKnownFields(payload, REMINDER_MUTATION_FIELDS);

  const updates: string[] = [];
  const values: D1Value[] = [];

  const title = stringField(payload, "title", { maxLength: 180, required: true });
  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }

  const notes = stringField(payload, "notes", { maxLength: 4000 });
  if (notes !== undefined) {
    updates.push("notes = ?");
    values.push(notes);
  }

  const dueAt = isoUtcField(payload, "dueAt");
  if (dueAt !== undefined) {
    updates.push("due_at = ?");
    values.push(dueAt);
  }

  const priority = enumField(payload, "priority", PRIORITIES);
  if (priority !== undefined) {
    updates.push("priority = ?");
    values.push(priority);
  }

  const status = enumField(payload, "status", REMINDER_STATUSES);
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
    updates.push("completed_at = ?");
    values.push(completedAtForStatus(status, existing.completed_at));
    updates.push("dismissed_at = ?");
    values.push(dismissedAtForStatus(status, existing.dismissed_at));
  }

  if (updates.length === 0) {
    throw new HttpError("No changes provided", 400);
  }

  const updatedAt = nowIso();
  updates.push("updated_at = ?");
  values.push(updatedAt, reminderId, ownerSubject);

  await prepare(
    db,
    `UPDATE reminders SET ${updates.join(", ")} WHERE id = ? AND owner_subject = ?`,
    values,
  ).run();

  const updated = await findReminder(db, ownerSubject, reminderId);

  if (!updated) {
    throw new HttpError("Not found", 404);
  }

  return success(toReminderDto(updated), { headers: noStore() });
}
