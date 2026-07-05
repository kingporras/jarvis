import { allRows, firstRow, prepare } from "./db";
import { HttpError, readJson, success } from "./responses";
import type { D1Database, D1Value } from "./types";

const PERSON_STATUSES = ["active", "archived"] as const;
const PERSON_CREATE_FIELDS = new Set(["name", "relationship", "notes"]);
const PERSON_MUTATION_FIELDS = new Set(["name", "relationship", "notes", "status"]);

type PersonStatus = (typeof PERSON_STATUSES)[number];

interface PersonRow {
  id: string;
  name: string;
  role: string | null;
  relationship: string | null;
  notes: string | null;
  status: PersonStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface PersonDto {
  id: string;
  name: string;
  relationship: string | null;
  notes: string | null;
  status: PersonStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

const personSelect = [
  "id",
  "name",
  "role",
  "relationship",
  "notes",
  "status",
  "created_at",
  "updated_at",
  "archived_at",
].join(", ");

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `person_${crypto.randomUUID()}`;
}

function toPersonDto(row: PersonRow): PersonDto {
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship ?? row.role,
    notes: row.notes,
    status: row.status,
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
): TValue | undefined {
  const value = payload[field];

  if (value === undefined || value === null || value === "") {
    return undefined;
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

function archivedAtForStatus(status: PersonStatus, current: string | null = null): string | null {
  return status === "archived" ? current ?? nowIso() : null;
}

function noStore(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

async function findPerson(
  db: D1Database,
  ownerSubject: string,
  personId: string,
): Promise<PersonRow | null> {
  return firstRow<PersonRow>(
    db,
    `SELECT ${personSelect} FROM persons WHERE id = ? AND owner_subject = ?`,
    [personId, ownerSubject],
  );
}

export async function listPersons(
  request: Request,
  db: D1Database,
  ownerSubject: string,
): Promise<Response> {
  const url = new URL(request.url);
  const clauses = ["owner_subject = ?"];
  const values: D1Value[] = [ownerSubject];
  const status = filterParam(url, "status", PERSON_STATUSES);

  if (status) {
    clauses.push("status = ?");
    values.push(status);
  }

  const rows = await allRows<PersonRow>(
    db,
    `SELECT ${personSelect}
     FROM persons
     WHERE ${clauses.join(" AND ")}
     ORDER BY updated_at DESC, id ASC`,
    values,
  );

  return success(rows.map(toPersonDto), { headers: noStore() });
}

export async function createPerson(
  request: Request,
  db: D1Database,
  ownerSubject: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const payload = await readJson(request);
  assertKnownFields(payload, PERSON_CREATE_FIELDS);

  const createdAt = nowIso();
  const relationship = stringField(payload, "relationship", { maxLength: 180 }) ?? null;
  const row: PersonRow = {
    id: newId(),
    name: stringField(payload, "name", { maxLength: 180, required: true }) ?? invalidRequired("name"),
    role: relationship,
    relationship,
    notes: stringField(payload, "notes", { maxLength: 4000 }) ?? null,
    status: "active",
    created_at: createdAt,
    updated_at: createdAt,
    archived_at: null,
  };

  await prepare(
    db,
    `INSERT INTO persons
      (id, owner_subject, name, role, relationship, notes, status, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      ownerSubject,
      row.name,
      row.role,
      row.relationship,
      row.notes,
      row.status,
      row.created_at,
      row.updated_at,
      row.archived_at,
    ],
  ).run();

  return success(toPersonDto(row), { status: 201, headers: noStore() });
}

export async function updatePerson(
  request: Request,
  db: D1Database,
  ownerSubject: string,
  personId: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const existing = await findPerson(db, ownerSubject, personId);

  if (!existing) {
    throw new HttpError("Not found", 404);
  }

  const payload = await readJson(request);
  assertKnownFields(payload, PERSON_MUTATION_FIELDS);

  const updates: string[] = [];
  const values: D1Value[] = [];

  const name = stringField(payload, "name", { maxLength: 180, required: true });
  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name);
  }

  const relationship = stringField(payload, "relationship", { maxLength: 180 });
  if (relationship !== undefined) {
    updates.push("relationship = ?");
    values.push(relationship);
    updates.push("role = ?");
    values.push(relationship);
  }

  const notes = stringField(payload, "notes", { maxLength: 4000 });
  if (notes !== undefined) {
    updates.push("notes = ?");
    values.push(notes);
  }

  const status = enumField(payload, "status", PERSON_STATUSES);
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
    updates.push("archived_at = ?");
    values.push(archivedAtForStatus(status, existing.archived_at));
  }

  if (updates.length === 0) {
    throw new HttpError("No changes provided", 400);
  }

  const updatedAt = nowIso();
  updates.push("updated_at = ?");
  values.push(updatedAt, personId, ownerSubject);

  await prepare(
    db,
    `UPDATE persons SET ${updates.join(", ")} WHERE id = ? AND owner_subject = ?`,
    values,
  ).run();

  const updated = await findPerson(db, ownerSubject, personId);

  if (!updated) {
    throw new HttpError("Not found", 404);
  }

  return success(toPersonDto(updated), { headers: noStore() });
}
