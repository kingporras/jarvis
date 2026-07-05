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
const LINK_TARGET_TYPES = ["project", "task"] as const;
const EMPTY_FIELDS = new Set<string>();
const MEMORY_MUTATION_FIELDS = new Set([
  "title",
  "content",
  "type",
  "priority",
  "status",
  "source",
  "confidence",
  "expiresAt",
  "reviewDueAt",
]);
const MEMORY_CREATE_FIELDS = new Set([
  "title",
  "content",
  "type",
  "priority",
  "source",
  "confidence",
  "expiresAt",
  "reviewDueAt",
]);
const LINK_CREATE_FIELDS = new Set(["targetType", "targetId"]);

type MemoryType = (typeof MEMORY_TYPES)[number];
type Priority = (typeof PRIORITIES)[number];
type MemoryStatus = (typeof MEMORY_STATUSES)[number];
type MemorySource = (typeof MEMORY_SOURCES)[number];
type LinkTargetType = (typeof LINK_TARGET_TYPES)[number];

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
  review_due_at: string | null;
  last_reviewed_at: string | null;
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
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

interface MemoryLinkRow {
  id: string;
  target_type: LinkTargetType;
  target_id: string;
  target_title: string;
  target_status: string | null;
  created_at: string;
}

interface MemoryLinkDto {
  id: string;
  targetType: LinkTargetType;
  targetId: string;
  targetTitle: string;
  targetStatus: string | null;
  createdAt: string;
}

interface OwnedTarget {
  id: string;
  title: string;
  status: string | null;
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
  "review_due_at",
  "last_reviewed_at",
  "created_at",
  "updated_at",
  "archived_at",
].join(", ");

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: "memory" | "memory_link" = "memory"): string {
  return `${prefix}_${crypto.randomUUID()}`;
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
    reviewDueAt: row.review_due_at,
    lastReviewedAt: row.last_reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function toMemoryLinkDto(row: MemoryLinkRow): MemoryLinkDto {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetTitle: row.target_title,
    targetStatus: row.target_status,
    createdAt: row.created_at,
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

async function readEmptyJsonIfPresent(request: Request): Promise<void> {
  const contentLength = request.headers.get("Content-Length");
  const hasBody =
    request.body !== null &&
    (contentLength === null || contentLength.trim() === "" || contentLength.trim() !== "0");

  if (!hasBody) {
    return;
  }

  assertJsonRequest(request);
  const payload = await readJson(request);
  assertKnownFields(payload, EMPTY_FIELDS);
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

async function assertOwnedMemory(db: D1Database, ownerSubject: string, memoryId: string): Promise<MemoryRow> {
  const memory = await findMemory(db, ownerSubject, memoryId);

  if (!memory) {
    throw new HttpError("Not found", 404);
  }

  return memory;
}

async function findOwnedTarget(
  db: D1Database,
  ownerSubject: string,
  targetType: LinkTargetType,
  targetId: string,
): Promise<OwnedTarget | null> {
  if (targetType === "project") {
    return firstRow<OwnedTarget>(
      db,
      "SELECT id, name AS title, status FROM projects WHERE id = ? AND owner_subject = ?",
      [targetId, ownerSubject],
    );
  }

  return firstRow<OwnedTarget>(
    db,
    "SELECT id, title, status FROM tasks WHERE id = ? AND owner_subject = ?",
    [targetId, ownerSubject],
  );
}

async function assertOwnedTarget(
  db: D1Database,
  ownerSubject: string,
  targetType: LinkTargetType,
  targetId: string,
): Promise<OwnedTarget> {
  const target = await findOwnedTarget(db, ownerSubject, targetType, targetId);

  if (!target) {
    throw new HttpError("Not found", 404);
  }

  return target;
}

async function findLinkForMemory(
  db: D1Database,
  memoryId: string,
  linkId: string,
): Promise<{ id: string } | null> {
  return firstRow<{ id: string }>(
    db,
    "SELECT id FROM memory_links WHERE id = ? AND source_memory_id = ?",
    [linkId, memoryId],
  );
}

async function findExistingLink(
  db: D1Database,
  memoryId: string,
  targetType: LinkTargetType,
  targetId: string,
): Promise<{ id: string } | null> {
  return firstRow<{ id: string }>(
    db,
    "SELECT id FROM memory_links WHERE source_memory_id = ? AND target_type = ? AND target_id = ?",
    [memoryId, targetType, targetId],
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

function targetIdField(payload: Record<string, unknown>): string {
  const value = stringField(payload, "targetId", { maxLength: 180, required: true });
  return value ?? invalidRequired("targetId");
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
    review_due_at: optionalDateField(payload, "reviewDueAt") ?? null,
    last_reviewed_at: null,
    created_at: createdAt,
    updated_at: createdAt,
    archived_at: null,
  };

  await prepare(
    db,
    `INSERT INTO memory_items
      (id, owner_subject, title, content, type, priority, status, source, confidence, expires_at, review_due_at, last_reviewed_at, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      row.review_due_at,
      row.last_reviewed_at,
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

  const existing = await assertOwnedMemory(db, ownerSubject, memoryId);
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

  const reviewDueAt = optionalDateField(payload, "reviewDueAt");
  if (reviewDueAt !== undefined) {
    updates.push("review_due_at = ?");
    values.push(reviewDueAt);
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

export async function listMemoryLinks(
  db: D1Database,
  ownerSubject: string,
  memoryId: string,
): Promise<Response> {
  await assertOwnedMemory(db, ownerSubject, memoryId);

  const rows = await allRows<MemoryLinkRow>(
    db,
    `SELECT
       memory_links.id,
       memory_links.target_type,
       memory_links.target_id,
       CASE
         WHEN memory_links.target_type = 'project' THEN projects.name
         ELSE tasks.title
       END AS target_title,
       CASE
         WHEN memory_links.target_type = 'project' THEN projects.status
         ELSE tasks.status
       END AS target_status,
       memory_links.created_at
     FROM memory_links
     LEFT JOIN projects
       ON memory_links.target_type = 'project'
      AND projects.id = memory_links.target_id
      AND projects.owner_subject = ?
     LEFT JOIN tasks
       ON memory_links.target_type = 'task'
      AND tasks.id = memory_links.target_id
      AND tasks.owner_subject = ?
     WHERE memory_links.source_memory_id = ?
       AND (
         (memory_links.target_type = 'project' AND projects.id IS NOT NULL)
         OR (memory_links.target_type = 'task' AND tasks.id IS NOT NULL)
       )
     ORDER BY memory_links.created_at DESC, memory_links.id ASC`,
    [ownerSubject, ownerSubject, memoryId],
  );

  return success(rows.map(toMemoryLinkDto), { headers: noStore() });
}

export async function createMemoryLink(
  request: Request,
  db: D1Database,
  ownerSubject: string,
  memoryId: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);
  await assertOwnedMemory(db, ownerSubject, memoryId);

  const payload = await readJson(request);
  assertKnownFields(payload, LINK_CREATE_FIELDS);

  const targetType = enumField(payload, "targetType", LINK_TARGET_TYPES) ?? invalidRequired("targetType");
  const targetId = targetIdField(payload);
  const target = await assertOwnedTarget(db, ownerSubject, targetType, targetId);
  const existing = await findExistingLink(db, memoryId, targetType, targetId);

  if (existing) {
    throw new HttpError("Link already exists", 400);
  }

  const createdAt = nowIso();
  const linkId = newId("memory_link");

  await prepare(
    db,
    "INSERT INTO memory_links (id, source_memory_id, target_type, target_id, relation, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [linkId, memoryId, targetType, targetId, "related", createdAt],
  ).run();

  return success(
    {
      id: linkId,
      targetType,
      targetId,
      targetTitle: target.title,
      targetStatus: target.status,
      createdAt,
    },
    { status: 201, headers: noStore() },
  );
}

export async function deleteMemoryLink(
  request: Request,
  db: D1Database,
  ownerSubject: string,
  memoryId: string,
  linkId: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  await assertOwnedMemory(db, ownerSubject, memoryId);

  const link = await findLinkForMemory(db, memoryId, linkId);

  if (!link) {
    throw new HttpError("Not found", 404);
  }

  await prepare(
    db,
    "DELETE FROM memory_links WHERE id = ? AND source_memory_id = ?",
    [linkId, memoryId],
  ).run();

  return success({ id: linkId }, { headers: noStore() });
}

export async function reviewMemory(
  request: Request,
  db: D1Database,
  ownerSubject: string,
  memoryId: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  await readEmptyJsonIfPresent(request);
  await assertOwnedMemory(db, ownerSubject, memoryId);

  const reviewedAt = nowIso();

  await prepare(
    db,
    `UPDATE memory_items
     SET last_reviewed_at = ?,
         review_due_at = ?,
         updated_at = ?
     WHERE id = ? AND owner_subject = ?`,
    [reviewedAt, null, reviewedAt, memoryId, ownerSubject],
  ).run();

  const updated = await findMemory(db, ownerSubject, memoryId);

  if (!updated) {
    throw new HttpError("Not found", 404);
  }

  return success(toMemoryDto(updated), { headers: noStore() });
}
