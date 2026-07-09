import { allRows, firstRow, prepare } from "./db";
import { error, HttpError, readJson, success } from "./responses";
import type { D1Database, D1Value } from "./types";

type ActionType =
  | "create_task"
  | "save_memory"
  | "create_decision"
  | "create_reminder"
  | "update_task_status";
type Confidence = "low" | "medium" | "high";
type Priority = "P0" | "P1" | "P2" | "P3" | "P4";
type MemoryType =
  | "personal"
  | "project"
  | "decision"
  | "preference"
  | "task_context"
  | "person"
  | "knowledge"
  | "system";
type TaskActionStatus = "todo" | "in_progress" | "waiting" | "done" | "canceled";
type ActionStatus = "executed" | "failed";

interface ProposalInput {
  confidence: Confidence;
  id: string;
  payload: Record<string, unknown>;
  requiresApproval: true;
  status: "preview_only";
  summary: string;
  title: string;
  type: ActionType;
  warnings: string[];
}

interface ApprovalInput {
  confirmed: true;
  sourceRequestId: string | null;
}

interface ProjectMatch {
  id: string;
  name: string;
}

interface EntityResult {
  id: string;
  kind: "task" | "memory" | "decision" | "reminder";
  title: string;
}

interface ExecutionResult {
  entity: EntityResult;
  payload: Record<string, string | null>;
  targetId: string;
  targetType: string;
  warnings: string[];
}

interface CreateTaskPayload {
  dueAt: string | null;
  notes: string | null;
  priority: Priority | null;
  projectHint: string | null;
  title: string;
}

interface SaveMemoryPayload {
  content: string;
  priority: Priority | null;
  projectHint: string | null;
  reviewDueAt: string | null;
  type: MemoryType;
}

interface CreateDecisionPayload {
  context: string | null;
  options: string | null;
  projectHint: string | null;
  title: string;
}

interface CreateReminderPayload {
  dueAt: string;
  notes: string | null;
  priority: Priority | null;
  title: string;
}

interface UpdateTaskStatusPayload {
  newStatus: TaskActionStatus;
  reason: string | null;
  taskHint: string;
}

type ValidatedPayload =
  | CreateTaskPayload
  | SaveMemoryPayload
  | CreateDecisionPayload
  | CreateReminderPayload
  | UpdateTaskStatusPayload;

class ActionError extends HttpError {
  code: string;

  constructor(code: string, status = 400) {
    super(code, status);
    this.code = code;
  }
}

const ACTION_TYPES = [
  "create_task",
  "save_memory",
  "create_decision",
  "create_reminder",
  "update_task_status",
] as const;
const CONFIDENCES = ["low", "medium", "high"] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3", "P4"] as const;
const MEMORY_TYPES = [
  "personal",
  "project",
  "decision",
  "preference",
  "task_context",
  "person",
  "knowledge",
  "system",
] as const;
const TASK_ACTION_STATUSES = ["todo", "in_progress", "waiting", "done", "canceled"] as const;
const FORBIDDEN_TEXT = /\b(owner_subject|jwt|claims|api[_ -]?key|secret|token|prompt|email)\b/gi;
const EMAIL_TEXT = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function noStore(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertSameOriginMutation(request: Request): void {
  const origin = request.headers.get("Origin");

  if (origin && origin !== new URL(request.url).origin) {
    throw new ActionError("FORBIDDEN", 403);
  }
}

function assertJsonRequest(request: Request): void {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ActionError("INVALID_ACTION_PROPOSAL");
  }
}

function sanitizeText(value: string): string {
  return value.replace(FORBIDDEN_TEXT, "[redacted]").replace(EMAIL_TEXT, "[redacted]").replace(/\p{Cc}/gu, " ");
}

function stringValue(
  value: unknown,
  code: string,
  options: { maxLength: number; required?: boolean } = { maxLength: 500 },
): string | null {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new ActionError(code);
    }

    return null;
  }

  if (typeof value !== "string") {
    throw new ActionError(code);
  }

  const trimmed = sanitizeText(value.trim());

  if (!trimmed) {
    if (options.required) {
      throw new ActionError(code);
    }

    return null;
  }

  if (trimmed.length > options.maxLength) {
    throw new ActionError(code);
  }

  return trimmed;
}

function enumValue<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  code: string,
  fallback: TValue | null = null,
): TValue | null {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string" || !allowed.includes(value as TValue)) {
    throw new ActionError(code);
  }

  return value as TValue;
}

function isoValue(value: unknown, code: string, required = false): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new ActionError(code);
    }

    return null;
  }

  if (typeof value !== "string") {
    throw new ActionError(code);
  }

  const timestamp = Date.parse(value.trim());

  if (!Number.isFinite(timestamp)) {
    throw new ActionError(code);
  }

  return new Date(timestamp).toISOString();
}

function actionType(value: unknown): ActionType {
  if (typeof value !== "string") {
    throw new ActionError("INVALID_ACTION_PROPOSAL");
  }

  if (!ACTION_TYPES.includes(value as ActionType)) {
    throw new ActionError("INVALID_ACTION_TYPE");
  }

  return value as ActionType;
}

function proposalId(value: unknown): string | null {
  return stringValue(value, "INVALID_ACTION_PROPOSAL", { maxLength: 100 }) ?? null;
}

function warningList(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ActionError("INVALID_ACTION_PROPOSAL");
  }

  return value
    .map((warning) => stringValue(warning, "INVALID_ACTION_PROPOSAL", { maxLength: 180 }))
    .filter((warning): warning is string => Boolean(warning))
    .slice(0, 3);
}

function parseApproval(value: unknown): ApprovalInput {
  if (!isRecord(value) || value.confirmed !== true) {
    throw new ActionError("APPROVAL_REQUIRED");
  }

  return {
    confirmed: true,
    sourceRequestId: stringValue(value.sourceRequestId, "INVALID_ACTION_PROPOSAL", {
      maxLength: 120,
    }),
  };
}

function parseProposal(value: unknown): ProposalInput {
  if (!isRecord(value) || Array.isArray(value.payload) || !isRecord(value.payload)) {
    throw new ActionError("INVALID_ACTION_PROPOSAL");
  }

  if (value.requiresApproval !== true || value.status !== "preview_only") {
    throw new ActionError("APPROVAL_REQUIRED");
  }

  const type = actionType(value.type);

  return {
    confidence: enumValue(value.confidence, CONFIDENCES, "INVALID_ACTION_PROPOSAL") ?? "low",
    id: proposalId(value.id) ?? newId("proposal"),
    payload: value.payload,
    requiresApproval: true,
    status: "preview_only",
    summary: stringValue(value.summary, "INVALID_ACTION_PROPOSAL", {
      maxLength: 500,
      required: true,
    }) ?? "",
    title: stringValue(value.title, "INVALID_ACTION_PROPOSAL", {
      maxLength: 140,
      required: true,
    }) ?? "",
    type,
    warnings: warningList(value.warnings),
  };
}

function parseRequestPayload(payload: Record<string, unknown>): { approval: ApprovalInput; proposal: ProposalInput } {
  if (Array.isArray(payload.proposal)) {
    throw new ActionError("INVALID_ACTION_PROPOSAL");
  }

  const approval = parseApproval(payload.approval);
  const proposal = parseProposal(payload.proposal);

  if (Object.keys(proposal.payload).length === 0) {
    throw new ActionError("INVALID_PAYLOAD");
  }

  return { approval, proposal };
}

function normalizePayload(proposal: ProposalInput): ValidatedPayload {
  const payload = proposal.payload;

  if (proposal.type === "create_task") {
    return {
      title: stringValue(payload.title, "INVALID_PAYLOAD", { maxLength: 140, required: true }) ?? "",
      notes: stringValue(payload.notes, "INVALID_PAYLOAD", { maxLength: 1500 }),
      priority: enumValue(payload.priority, PRIORITIES, "INVALID_PAYLOAD"),
      dueAt: isoValue(payload.dueAt, "INVALID_PAYLOAD"),
      projectHint: stringValue(payload.projectHint, "INVALID_PAYLOAD", { maxLength: 140 }),
    };
  }

  if (proposal.type === "save_memory") {
    return {
      type: enumValue(payload.type, MEMORY_TYPES, "INVALID_PAYLOAD", "knowledge") ?? "knowledge",
      content: stringValue(payload.content, "INVALID_PAYLOAD", { maxLength: 2000, required: true }) ?? "",
      priority: enumValue(payload.priority, PRIORITIES, "INVALID_PAYLOAD"),
      projectHint: stringValue(payload.projectHint, "INVALID_PAYLOAD", { maxLength: 140 }),
      reviewDueAt: isoValue(payload.reviewDueAt, "INVALID_PAYLOAD"),
    };
  }

  if (proposal.type === "create_decision") {
    return {
      title: stringValue(payload.title, "INVALID_PAYLOAD", { maxLength: 140, required: true }) ?? "",
      context: stringValue(payload.context, "INVALID_PAYLOAD", { maxLength: 1500 }),
      options: stringValue(payload.options, "INVALID_PAYLOAD", { maxLength: 1500 }),
      projectHint: stringValue(payload.projectHint, "INVALID_PAYLOAD", { maxLength: 140 }),
    };
  }

  if (proposal.type === "create_reminder") {
    return {
      title: stringValue(payload.title, "INVALID_PAYLOAD", { maxLength: 140, required: true }) ?? "",
      notes: stringValue(payload.notes, "INVALID_PAYLOAD", { maxLength: 1500 }),
      dueAt: isoValue(payload.dueAt, "INVALID_PAYLOAD", true) ?? "",
      priority: enumValue(payload.priority, PRIORITIES, "INVALID_PAYLOAD"),
    };
  }

  return {
    taskHint: stringValue(payload.taskHint, "INVALID_PAYLOAD", { maxLength: 140, required: true }) ?? "",
    newStatus: enumValue(payload.newStatus, TASK_ACTION_STATUSES, "INVALID_PAYLOAD") ?? "todo",
    reason: stringValue(payload.reason, "INVALID_PAYLOAD", { maxLength: 1500 }),
  };
}

function payloadForAudit(payload: ValidatedPayload): Record<string, string | null> {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value ?? null]));
}

function confidenceNumber(confidence: Confidence): number {
  if (confidence === "high") {
    return 0.9;
  }

  if (confidence === "medium") {
    return 0.66;
  }

  return 0.33;
}

function priorityOrDefault(priority: Priority | null): Priority {
  return priority ?? "P2";
}

async function resolveProjectHint(
  db: D1Database,
  ownerSubject: string,
  projectHint: string | null,
): Promise<{ project: ProjectMatch | null; warnings: string[] }> {
  if (!projectHint) {
    return { project: null, warnings: [] };
  }

  const matches = await allRows<ProjectMatch>(
    db,
    `SELECT id, name
     FROM projects
     WHERE owner_subject = ?
       AND (id = ? OR LOWER(name) = LOWER(?) OR INSTR(LOWER(name), LOWER(?)) > 0)
     ORDER BY updated_at DESC, id ASC
     LIMIT 3`,
    [ownerSubject, projectHint, projectHint, projectHint],
  );

  if (matches.length === 1) {
    return { project: matches[0], warnings: [] };
  }

  if (matches.length > 1) {
    return {
      project: null,
      warnings: [`Proyecto ambiguo para "${projectHint}". Accion creada sin proyecto.`],
    };
  }

  return {
    project: null,
    warnings: [`No encontre proyecto propio para "${projectHint}". Accion creada sin proyecto.`],
  };
}

async function findTaskTarget(
  db: D1Database,
  ownerSubject: string,
  taskHint: string,
): Promise<{ id: string; title: string } | null> {
  const exactById = await firstRow<{ id: string; title: string }>(
    db,
    "SELECT id, title FROM tasks WHERE owner_subject = ? AND id = ?",
    [ownerSubject, taskHint],
  );

  if (exactById) {
    return exactById;
  }

  const matches = await allRows<{ id: string; title: string }>(
    db,
    `SELECT id, title
     FROM tasks
     WHERE owner_subject = ?
       AND (LOWER(title) = LOWER(?) OR INSTR(LOWER(title), LOWER(?)) > 0)
     ORDER BY updated_at DESC, id ASC
     LIMIT 3`,
    [ownerSubject, taskHint, taskHint],
  );

  if (matches.length === 0) {
    throw new ActionError("TARGET_NOT_FOUND", 404);
  }

  if (matches.length > 1) {
    throw new ActionError("TARGET_AMBIGUOUS", 409);
  }

  return matches[0];
}

async function executeCreateTask(
  db: D1Database,
  ownerSubject: string,
  payload: CreateTaskPayload,
): Promise<ExecutionResult> {
  const createdAt = nowIso();
  const taskId = newId("task");
  const projectResolution = await resolveProjectHint(db, ownerSubject, payload.projectHint);

  await prepare(
    db,
    `INSERT INTO tasks
      (id, owner_subject, project_id, title, description, status, priority, due_date, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      taskId,
      ownerSubject,
      projectResolution.project?.id ?? null,
      payload.title,
      payload.notes,
      "todo",
      priorityOrDefault(payload.priority),
      payload.dueAt,
      createdAt,
      createdAt,
      null,
    ],
  ).run();

  return {
    entity: { kind: "task", id: taskId, title: payload.title },
    payload: payloadForAudit(payload),
    targetId: taskId,
    targetType: "task",
    warnings: projectResolution.warnings,
  };
}

async function executeSaveMemory(
  db: D1Database,
  ownerSubject: string,
  proposal: ProposalInput,
  payload: SaveMemoryPayload,
): Promise<ExecutionResult> {
  const createdAt = nowIso();
  const memoryId = newId("memory");
  const projectResolution = await resolveProjectHint(db, ownerSubject, payload.projectHint);
  const warnings = [...projectResolution.warnings];

  await prepare(
    db,
    `INSERT INTO memory_items
      (id, owner_subject, title, content, type, priority, status, source, confidence, expires_at, review_due_at, last_reviewed_at, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      memoryId,
      ownerSubject,
      proposal.title,
      payload.content,
      payload.type,
      priorityOrDefault(payload.priority),
      "active",
      "manual",
      confidenceNumber(proposal.confidence),
      null,
      payload.reviewDueAt,
      null,
      createdAt,
      createdAt,
      null,
    ],
  ).run();

  if (projectResolution.project) {
    await prepare(
      db,
      "INSERT INTO memory_links (id, source_memory_id, target_type, target_id, relation, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [newId("memory_link"), memoryId, "project", projectResolution.project.id, "related", createdAt],
    ).run();
  } else if (payload.projectHint) {
    warnings.push("Memoria guardada sin enlace de proyecto.");
  }

  return {
    entity: { kind: "memory", id: memoryId, title: proposal.title },
    payload: payloadForAudit(payload),
    targetId: memoryId,
    targetType: "memory",
    warnings,
  };
}

async function executeCreateDecision(
  db: D1Database,
  ownerSubject: string,
  payload: CreateDecisionPayload,
): Promise<ExecutionResult> {
  const createdAt = nowIso();
  const decisionId = newId("decision");
  const projectResolution = await resolveProjectHint(db, ownerSubject, payload.projectHint);

  await prepare(
    db,
    `INSERT INTO decisions
      (id, owner_subject, project_id, title, reason, impact, context, outcome, rationale, status, priority, decided_at, created_at, updated_at, archived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      decisionId,
      ownerSubject,
      projectResolution.project?.id ?? null,
      payload.title,
      payload.context,
      payload.options,
      payload.context,
      payload.options,
      null,
      "open",
      "P2",
      "",
      createdAt,
      createdAt,
      null,
    ],
  ).run();

  return {
    entity: { kind: "decision", id: decisionId, title: payload.title },
    payload: payloadForAudit(payload),
    targetId: decisionId,
    targetType: "decision",
    warnings: projectResolution.warnings,
  };
}

async function executeCreateReminder(
  db: D1Database,
  ownerSubject: string,
  payload: CreateReminderPayload,
): Promise<ExecutionResult> {
  const createdAt = nowIso();
  const reminderId = newId("reminder");

  await prepare(
    db,
    `INSERT INTO reminders
      (id, owner_subject, title, notes, remind_at, due_at, priority, status, created_at, updated_at, completed_at, dismissed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminderId,
      ownerSubject,
      payload.title,
      payload.notes,
      null,
      payload.dueAt,
      priorityOrDefault(payload.priority),
      "pending",
      createdAt,
      createdAt,
      null,
      null,
    ],
  ).run();

  return {
    entity: { kind: "reminder", id: reminderId, title: payload.title },
    payload: payloadForAudit(payload),
    targetId: reminderId,
    targetType: "reminder",
    warnings: [],
  };
}

async function executeUpdateTaskStatus(
  db: D1Database,
  ownerSubject: string,
  payload: UpdateTaskStatusPayload,
): Promise<ExecutionResult> {
  const task = await findTaskTarget(db, ownerSubject, payload.taskHint);

  if (!task) {
    throw new ActionError("TARGET_NOT_FOUND", 404);
  }

  const updatedAt = nowIso();
  await prepare(
    db,
    `UPDATE tasks
     SET status = ?,
         updated_at = ?,
         completed_at = ?
     WHERE id = ? AND owner_subject = ?`,
    [payload.newStatus, updatedAt, payload.newStatus === "done" ? updatedAt : null, task.id, ownerSubject],
  ).run();

  return {
    entity: { kind: "task", id: task.id, title: task.title },
    payload: payloadForAudit(payload),
    targetId: task.id,
    targetType: "task",
    warnings: [],
  };
}

async function executeAction(
  db: D1Database,
  ownerSubject: string,
  proposal: ProposalInput,
  validatedPayload: ValidatedPayload,
): Promise<ExecutionResult> {
  if (proposal.type === "create_task") {
    return executeCreateTask(db, ownerSubject, validatedPayload as CreateTaskPayload);
  }

  if (proposal.type === "save_memory") {
    return executeSaveMemory(db, ownerSubject, proposal, validatedPayload as SaveMemoryPayload);
  }

  if (proposal.type === "create_decision") {
    return executeCreateDecision(db, ownerSubject, validatedPayload as CreateDecisionPayload);
  }

  if (proposal.type === "create_reminder") {
    return executeCreateReminder(db, ownerSubject, validatedPayload as CreateReminderPayload);
  }

  return executeUpdateTaskStatus(db, ownerSubject, validatedPayload as UpdateTaskStatusPayload);
}

async function insertAudit(
  db: D1Database,
  ownerSubject: string,
  values: {
    actionId: string;
    actionType: ActionType;
    createdAt: string;
    errorCode: string | null;
    payload: Record<string, string | null>;
    proposalId: string;
    result: Record<string, unknown> | null;
    sourceRequestId: string | null;
    status: ActionStatus;
    summary: string;
    targetId: string | null;
    targetType: string | null;
    warnings: string[];
  },
): Promise<void> {
  const auditValues: D1Value[] = [
    values.actionId,
    ownerSubject,
    values.actionType,
    values.sourceRequestId,
    values.proposalId,
    values.status,
    values.targetType,
    values.targetId,
    values.summary,
    JSON.stringify(values.payload),
    values.result ? JSON.stringify(values.result) : null,
    JSON.stringify(values.warnings),
    values.errorCode,
    values.createdAt,
  ];

  await prepare(
    db,
    `INSERT INTO action_executions
      (id, owner_subject, action_type, source_request_id, proposal_id, status, target_type, target_id, summary, payload_json, result_json, warnings_json, error_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    auditValues,
  ).run();
}

function publicResult(
  actionId: string,
  proposal: ProposalInput,
  result: ExecutionResult,
  warnings: string[],
  executedAt: string,
): Record<string, unknown> {
  return {
    actionId,
    type: proposal.type,
    status: "executed",
    entity: result.entity,
    warnings,
    executedAt,
  };
}

function mergeWarnings(proposalWarnings: string[], executionWarnings: string[]): string[] {
  return Array.from(new Set([...proposalWarnings, ...executionWarnings])).slice(0, 6);
}

export async function executeApprovedAction(
  request: Request,
  db: D1Database,
  ownerSubject: string,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    assertJsonRequest(request);
  } catch (caughtError) {
    if (caughtError instanceof HttpError) {
      return error(caughtError.message, caughtError.status, { headers: noStore() });
    }

    throw caughtError;
  }

  let approval: ApprovalInput;
  let proposal: ProposalInput;
  let validatedPayload: ValidatedPayload;

  try {
    const payload = await readJson(request);
    ({ approval, proposal } = parseRequestPayload(payload));
    validatedPayload = normalizePayload(proposal);
  } catch (caughtError) {
    if (caughtError instanceof HttpError) {
      return error(caughtError.message, caughtError.status, { headers: noStore() });
    }

    throw caughtError;
  }

  const actionId = newId("action");
  const executedAt = nowIso();

  try {
    const result = await executeAction(db, ownerSubject, proposal, validatedPayload);
    const warnings = mergeWarnings(proposal.warnings, result.warnings);
    const responseData = publicResult(actionId, proposal, result, warnings, executedAt);

    await insertAudit(db, ownerSubject, {
      actionId,
      actionType: proposal.type,
      createdAt: executedAt,
      errorCode: null,
      payload: result.payload,
      proposalId: proposal.id,
      result: responseData,
      sourceRequestId: approval.sourceRequestId,
      status: "executed",
      summary: proposal.summary,
      targetId: result.targetId,
      targetType: result.targetType,
      warnings,
    });

    return success(responseData, { headers: noStore() });
  } catch (caughtError) {
    const actionError =
      caughtError instanceof ActionError
        ? caughtError
        : new ActionError("ACTION_EXECUTION_FAILED", 500);
    const auditPayload = payloadForAudit(validatedPayload);

    await insertAudit(db, ownerSubject, {
      actionId,
      actionType: proposal.type,
      createdAt: executedAt,
      errorCode: actionError.code,
      payload: auditPayload,
      proposalId: proposal.id,
      result: null,
      sourceRequestId: approval.sourceRequestId,
      status: "failed",
      summary: proposal.summary,
      targetId: null,
      targetType: null,
      warnings: proposal.warnings,
    }).catch(() => undefined);

    console.error("Action execution failed", {
      actionId,
      status: actionError.status,
      type: proposal.type,
    });

    return error(actionError.message, actionError.status, { headers: noStore() });
  }
}
