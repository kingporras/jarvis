import { allRows, firstRow, prepare } from "./db";
import { HttpError, readJson, success } from "./responses";
import type { D1Database, D1Value } from "./types";

const DECISION_STATUSES = ["open", "decided", "superseded", "archived"] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3", "P4"] as const;
const DECISION_MUTATION_FIELDS = new Set([
  "title",
  "context",
  "outcome",
  "rationale",
  "status",
  "priority",
  "projectId",
]);

type DecisionStatus = (typeof DECISION_STATUSES)[number];
type Priority = (typeof PRIORITIES)[number];

interface DecisionRow {
  id: string;
  project_id: string | null;
  project_name: string | null;
  title: string;
  context: string | null;
  outcome: string | null;
  rationale: string | null;
  reason: string | null;
  impact: string | null;
  status: DecisionStatus;
  priority: Priority;
  decided_at: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface DecisionDto {
  id: string;
  projectId: string | null;
  projectName: string | null;
  title: string;
  context: string | null;
  outcome: string | null;
  rationale: string | null;
  status: DecisionStatus;
  priority: Priority;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

const decisionSelect = [
  "decisions.id",
  "decisions.project_id",
  "projects.name AS project_name",
  "decisions.title",
  "decisions.context",
  "decisions.outcome",
  "decisions.rationale",
  "decisions.reason",
  "decisions.impact",
  "decisions.status",
  "decisions.priority",
  "decisions.decided_at",
  "decisions.created_at",
  "decisions.updated_at",
  "decisions.archived_at",
].join(", ");

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `decision_${crypto.randomUUID()}`;
}

function toDecisionDto(row: DecisionRow): DecisionDto {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    title: row.title,
    context: row.context ?? row.reason,
    outcome: row.outcome ?? row.impact,
    rationale: row.rationale,
    status: row.status,
    priority: row.priority,
    decidedAt: row.decided_at || null,
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

function noStore(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

function decidedAtForStatus(status: DecisionStatus, current: string | null = null): string {
  return status === "decided" ? current || nowIso() : "";
}

function archivedAtForStatus(status: DecisionStatus, current: string | null = null): string | null {
  return status === "archived" ? current ?? nowIso() : null;
}

function projectIdField(payload: Record<string, unknown>): string | null | undefined {
  return stringField(payload, "projectId", { maxLength: 180 });
}

async function assertOwnedProject(
  db: D1Database,
  ownerSubject: string,
  projectId: string,
): Promise<void> {
  const project = await firstRow<{ id: string }>(
    db,
    "SELECT id FROM projects WHERE id = ? AND owner_subject = ?",
    [projectId, ownerSubject],
  );

  if (!project) {
    throw new HttpError("Not found", 404);
  }
}

async function findDecision(
  db: D1Database,
  ownerSubject: string,
  decisionId: string,
): Promise<DecisionRow | null> {
  return firstRow<DecisionRow>(
    db,
    `SELECT ${decisionSelect}
     FROM decisions
     LEFT JOIN projects
       ON projects.id = decisions.project_id
      AND projects.owner_subject = decisions.owner_subject
     WHERE decisions.id = ? AND decisions.owner_subject = ?`,
    [decisionId, ownerSubject],
  );
}

export async function listDecisions(
  request: Request,
  db: D1Database,
  ownerSubject: string,
): Promise<Response> {
  const url = new URL(request.url);
  const clauses = ["decisions.owner_subject = ?"];
  const values: D1Value[] = [ownerSubject];
  const status = filterParam(url, "status", DECISION_STATUSES);
  const priority = filterParam(url, "priority", PRIORITIES);
  const projectId = url.searchParams.get("projectId");

  if (status) {
    clauses.push("decisions.status = ?");
    values.push(status);
  }

  if (priority) {
    clauses.push("decisions.priority = ?");
    values.push(priority);
  }

  if (projectId) {
    clauses.push("decisions.project_id = ?");
    values.push(projectId);
  }

  const rows = await allRows<DecisionRow>(
    db,
    `SELECT ${decisionSelect}
     FROM decisions
     LEFT JOIN projects
       ON projects.id = decisions.project_id
      AND projects.owner_subject = decisions.owner_subject
     WHERE ${clauses.join(" AND ")}
     ORDER BY decisions.updated_at DESC, decisions.id ASC`,
    values,
  );

  return success(rows.map(toDecisionDto), { headers: noStore() });
}

export async function createDecision(
  request: Request,
  db: D1Database,
  ownerSubject: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const payload = await readJson(request);
  assertKnownFields(payload, DECISION_MUTATION_FIELDS);

  const projectId = projectIdField(payload) ?? null;
  if (projectId) {
    await assertOwnedProject(db, ownerSubject, projectId);
  }

  const createdAt = nowIso();
  const status = enumField(payload, "status", DECISION_STATUSES, "open") ?? "open";
  const context = stringField(payload, "context", { maxLength: 2000 }) ?? null;
  const outcome = stringField(payload, "outcome", { maxLength: 2000 }) ?? null;
  const row: DecisionRow = {
    id: newId(),
    project_id: projectId,
    project_name: null,
    title: stringField(payload, "title", { maxLength: 180, required: true }) ?? invalidRequired("title"),
    context,
    outcome,
    rationale: stringField(payload, "rationale", { maxLength: 3000 }) ?? null,
    reason: context,
    impact: outcome,
    status,
    priority: enumField(payload, "priority", PRIORITIES, "P2") ?? "P2",
    decided_at: decidedAtForStatus(status),
    created_at: createdAt,
    updated_at: createdAt,
    archived_at: archivedAtForStatus(status),
  };

  await prepare(
    db,
    `INSERT INTO decisions
      (id, owner_subject, project_id, title, reason, impact, context, outcome, rationale, status, priority, decided_at, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      ownerSubject,
      row.project_id,
      row.title,
      row.reason,
      row.impact,
      row.context,
      row.outcome,
      row.rationale,
      row.status,
      row.priority,
      row.decided_at,
      row.created_at,
      row.updated_at,
      row.archived_at,
    ],
  ).run();

  const created = await findDecision(db, ownerSubject, row.id);

  if (!created) {
    throw new HttpError("Not found", 404);
  }

  return success(toDecisionDto(created), { status: 201, headers: noStore() });
}

export async function updateDecision(
  request: Request,
  db: D1Database,
  ownerSubject: string,
  decisionId: string,
): Promise<Response> {
  assertSameOriginMutation(request);
  assertJsonRequest(request);

  const existing = await findDecision(db, ownerSubject, decisionId);

  if (!existing) {
    throw new HttpError("Not found", 404);
  }

  const payload = await readJson(request);
  assertKnownFields(payload, DECISION_MUTATION_FIELDS);

  const updates: string[] = [];
  const values: D1Value[] = [];

  const title = stringField(payload, "title", { maxLength: 180, required: true });
  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }

  const context = stringField(payload, "context", { maxLength: 2000 });
  if (context !== undefined) {
    updates.push("context = ?");
    values.push(context);
    updates.push("reason = ?");
    values.push(context);
  }

  const outcome = stringField(payload, "outcome", { maxLength: 2000 });
  if (outcome !== undefined) {
    updates.push("outcome = ?");
    values.push(outcome);
    updates.push("impact = ?");
    values.push(outcome);
  }

  const rationale = stringField(payload, "rationale", { maxLength: 3000 });
  if (rationale !== undefined) {
    updates.push("rationale = ?");
    values.push(rationale);
  }

  const projectId = projectIdField(payload);
  if (projectId !== undefined) {
    if (projectId) {
      await assertOwnedProject(db, ownerSubject, projectId);
    }

    updates.push("project_id = ?");
    values.push(projectId);
  }

  const status = enumField(payload, "status", DECISION_STATUSES);
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
    updates.push("decided_at = ?");
    values.push(decidedAtForStatus(status, existing.decided_at));
    updates.push("archived_at = ?");
    values.push(archivedAtForStatus(status, existing.archived_at));
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
  values.push(updatedAt, decisionId, ownerSubject);

  await prepare(
    db,
    `UPDATE decisions SET ${updates.join(", ")} WHERE id = ? AND owner_subject = ?`,
    values,
  ).run();

  const updated = await findDecision(db, ownerSubject, decisionId);

  if (!updated) {
    throw new HttpError("Not found", 404);
  }

  return success(toDecisionDto(updated), { headers: noStore() });
}
