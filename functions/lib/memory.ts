import { allRows, firstRow, prepare } from "./db";
import { HttpError, readJson, success } from "./responses";
import type { D1Database, D1Value } from "./types";

const MEMORY_TYPES = [
  "personal",
  "preference",
  "project",
  "decision",
  "task_context",
  "person",
  "knowledge",
  "system",
] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3", "P4"] as const;
const MEMORY_STATUSES = ["active", "archived"] as const;
const MEMORY_SOURCES = ["manual"] as const;
const MEMORY_MUTATION_FIELDS = new Set([
  "title",
  "content",
  "type",
  "priority",
  "status",
  "source",
  "confidence",
  "expiresAt",
]);
const MEMORY_CREATE_FIELDS = new Set([
  "title",
  "content",
  "type",
  "priority",
  "source",
  "confidence",
  "expiresAt",
]);

type MemoryType = (typeof MEMORY_TYPES)[number];
type Priority = (typeof PRIORITIES)[number];
type MemoryStatus = (typeof MEMORY_STATUSES)[number];
type MemorySource = (typeof MEMORY_SOURCES)[number];

interface MemoryRow {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  priority: Priority;
  status: MemoryStatus;
  source: MemorySource;
  confidence: number | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface MemoryDto {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  priority: Priority;
  status: MemoryStatus;
  source: MemorySource;
  confidence: number | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

const memorySelect = [
  "id",
  "title",
  "content",
  "type",
  "priority",
  "status",
  "source",
  "confidence",
  "expires_at",
  "created_at",
  "updated_at",
  "archived_at",
].join(", ");

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `memory_${crypto.randomUUID()}`;
}

function toMemoryDto(row: MemoryRow): MemoryDto {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    priority: row.priority,
    status: row.status,
    source: row.source,
    confidence: row.confidence,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

function optionalDateField(payload: Record<string, unknown>, field: string): string | null | undefined {
  const value = payload[field];

  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || value.trim().length > 80) {
    throw new HttpError(`${field} is invalid`, 400);
  }

  return value.trim();
}

function confidenceField(payload: Record<string, unknown>, fallback?: number): number | undefined {
  const value = payload.confidence;

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new HttpError("confidence is invalid", 400);
  }

  return value;
}

function noStore(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

async function findMemory(db: D1Database, ownerSubject: string, memoryId: string): Promise<MemoryRow | null> {
  return firstRow<MemoryRow>(
    db,
    `SELECT ${memorySelect} FROM memory_items WHERE id = ? AND owner_subject = ?`,
    [memoryId, ownerSubject],
  );
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

export async function listMemory(request: Request, db: D1Database, ownerSubject: string): Promise<Response> {
  const url = new URL(request.url);
  const clauses = ["owner_subject = ?"];
  const values: D1Value[] = [ownerSubject];
  const type = filterParam(url, "type", MEMORY_TYPES);
  const status = filterParam(url, "status", MEMORY_STATUSES);
  const priority = filterParam(url, "priority", PRIORITIES);

  if (type) {
    clauses.push("type = ?");
    values.push(type);
  }

  if (status) {
    clauses.push("status = ?");
    values.push(status);
  }

  if (priority) {
    clauses.push("priority = ?");
    values.push(priority);
  }

  const rows = await allRows<MemoryRow>(
    db,
    `SELECT ${memorySelect}
     FROM memory_items
     WHERE ${clauses.join(" AND ")}
     ORDER BY updated_at DESC, id ASC`,
    values,
  );

  return success(rows.map(toMemoryDto), { headers: noStore() });
}

export async function createMemory(
  request: Request,
  db: D1Database,
  ownerSubject: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const payload = await readJson(request);
  assertKnownFields(payload, MEMORY_CREATE_FIELDS);

  const createdAt = nowIso();
  const row: MemoryRow = {
    id: newId(),
    title: stringField(payload, "title", { maxLength: 180, required: true }) ?? invalidRequired("title"),
    content: stringField(payload, "content", { maxLength: 8000, required: true }) ?? invalidRequired("content"),
    type: enumField(payload, "type", MEMORY_TYPES, "knowledge") ?? "knowledge",
    priority: enumField(payload, "priority", PRIORITIES, "P2") ?? "P2",
    status: "active",
    source: enumField(payload, "source", MEMORY_SOURCES, "manual") ?? "manual",
    confidence: confidenceField(payload, 1) ?? 1,
    expires_at: optionalDateField(payload, "expiresAt") ?? null,
    created_at: createdAt,
    updated_at: createdAt,
    archived_at: null,
  };

  await prepare(
    db,
    `INSERT INTO memory_items
      (id, owner_subject, title, content, type, priority, status, source, confidence, expires_at, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      ownerSubject,
      row.title,
      row.content,
      row.type,
      row.priority,
      row.status,
      row.source,
      row.confidence,
      row.expires_at,
      row.created_at,
      row.updated_at,
      row.archived_at,
    ],
  ).run();

  return success(toMemoryDto(row), { status: 201, headers: noStore() });
}

export async function updateMemory(
  request: Request,
  db: D1Database,
  ownerSubject: string,
  memoryId: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const existing = await findMemory(db, ownerSubject, memoryId);

  if (!existing) {
    throw new HttpError("Not found", 404);
  }

  const payload = await readJson(request);
  assertKnownFields(payload, MEMORY_MUTATION_FIELDS);

  const updates: string[] = [];
  const values: D1Value[] = [];

  const title = stringField(payload, "title", { maxLength: 180, required: true });
  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }

  const content = stringField(payload, "content", { maxLength: 8000, required: true });
  if (content !== undefined) {
    updates.push("content = ?");
    values.push(content);
  }

  const type = enumField(payload, "type", MEMORY_TYPES);
  if (type !== undefined) {
    updates.push("type = ?");
    values.push(type);
  }

  const priority = enumField(payload, "priority", PRIORITIES);
  if (priority !== undefined) {
    updates.push("priority = ?");
    values.push(priority);
  }

  const source = enumField(payload, "source", MEMORY_SOURCES);
  if (source !== undefined) {
    updates.push("source = ?");
    values.push(source);
  }

  const confidence = confidenceField(payload);
  if (confidence !== undefined) {
    updates.push("confidence = ?");
    values.push(confidence);
  }

  const expiresAt = optionalDateField(payload, "expiresAt");
  if (expiresAt !== undefined) {
    updates.push("expires_at = ?");
    values.push(expiresAt);
  }

  const status = enumField(payload, "status", MEMORY_STATUSES);
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
    updates.push("archived_at = ?");
    values.push(status === "archived" ? existing.archived_at ?? nowIso() : null);
  }

  if (updates.length === 0) {
    throw new HttpError("No changes provided", 400);
  }

  const updatedAt = nowIso();
  updates.push("updated_at = ?");
  values.push(updatedAt, memoryId, ownerSubject);

  await prepare(
    db,
    `UPDATE memory_items SET ${updates.join(", ")} WHERE id = ? AND owner_subject = ?`,
    values,
  ).run();

  const updated = await findMemory(db, ownerSubject, memoryId);

  if (!updated) {
    throw new HttpError("Not found", 404);
  }

  return success(toMemoryDto(updated), { headers: noStore() });
}
