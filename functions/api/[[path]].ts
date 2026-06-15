type D1Value = string | number | null;

interface D1Result<T> {
  results?: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env {
  DB?: D1Database;
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

interface PagesContext {
  request: Request;
  env: Env;
  params: {
    path?: string | string[];
  };
}

interface Project {
  id: string;
  name: string;
  objective: string | null;
  status: string;
  phase: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryItem {
  id: string;
  type: string;
  title: string;
  content: string;
  summary: string | null;
  source: string | null;
  priority: string;
  status: string;
  confidence: number | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Decision {
  id: string;
  project_id: string | null;
  title: string;
  reason: string | null;
  impact: string | null;
  decided_at: string;
  created_at: string;
  updated_at: string;
}

interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  remind_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const projectColumns = [
  "id",
  "name",
  "objective",
  "status",
  "phase",
  "priority",
  "created_at",
  "updated_at",
].join(", ");

const taskColumns = [
  "id",
  "project_id",
  "title",
  "description",
  "status",
  "priority",
  "due_date",
  "created_at",
  "updated_at",
].join(", ");

const memoryColumns = [
  "id",
  "type",
  "title",
  "content",
  "summary",
  "source",
  "priority",
  "status",
  "confidence",
  "expires_at",
  "last_used_at",
  "created_at",
  "updated_at",
].join(", ");

const decisionColumns = [
  "id",
  "project_id",
  "title",
  "reason",
  "impact",
  "decided_at",
  "created_at",
  "updated_at",
].join(", ");

const priorityOrderSql =
  "CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END";

function json<T>(data: T, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

function success<T>(data: T, init?: ResponseInit): Response {
  return json<ApiResponse<T>>({ ok: true, data }, init);
}

function error(message: string, status = 400): Response {
  return json<ApiResponse<never>>({ ok: false, error: message }, { status });
}

function notFound(): Response {
  return error("Not found", 404);
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const payload = await request.json();
    return asObject(payload);
  } catch {
    throw new HttpError("Invalid JSON payload", 400);
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix?: string): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("JSON payload must be an object", 400);
  }

  return value as Record<string, unknown>;
}

function requiredString(payload: Record<string, unknown>, field: string): string {
  const value = payload[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(`${field} is required`, 400);
  }

  return value.trim();
}

function optionalString(payload: Record<string, unknown>, field: string): string | null {
  const value = payload[field];

  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(`${field} must be a string`, 400);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalNumber(
  payload: Record<string, unknown>,
  field: string,
  fallback: number,
): number {
  const value = payload[field];

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpError(`${field} must be a number`, 400);
  }

  return value;
}

function getPath(params: PagesContext["params"]): string {
  const rawPath = params.path;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : rawPath ?? "";
  return `/${path}`.replace(/\/+/g, "/");
}

function getDb(env: Env): D1Database {
  if (!env.DB) {
    throw new HttpError("D1 binding DB is not configured", 503);
  }

  return env.DB;
}

function prepare(
  db: D1Database,
  query: string,
  values: D1Value[] = [],
): D1PreparedStatement {
  const statement = db.prepare(query);
  return values.length > 0 ? statement.bind(...values) : statement;
}

async function allRows<T>(
  db: D1Database,
  query: string,
  values: D1Value[] = [],
): Promise<T[]> {
  const result = await prepare(db, query, values).all<T>();
  return result.results ?? [];
}

async function firstRow<T>(
  db: D1Database,
  query: string,
  values: D1Value[] = [],
): Promise<T | null> {
  const result = await prepare(db, query, values).all<T>();
  return result.results?.[0] ?? null;
}

async function countRows(
  db: D1Database,
  query: string,
  values: D1Value[] = [],
): Promise<number> {
  const row = await firstRow<{ count: number }>(db, query, values);
  return Number(row?.count ?? 0);
}

async function handleHealth(db: D1Database): Promise<Response> {
  await firstRow<{ ok: number }>(db, "SELECT 1 as ok");

  return json({
    ok: true,
    service: "jarvis-api",
    db: "connected",
    timestamp: nowIso(),
  });
}

async function handleDashboard(db: D1Database): Promise<Response> {
  const [
    activeProjectsCount,
    openTasksCount,
    activeMemoryCount,
    decisionsCount,
    upcomingReminders,
    recentProjects,
    priorityTasks,
    recentMemory,
    recentDecisions,
  ] = await Promise.all([
    countRows(db, "SELECT COUNT(*) as count FROM projects WHERE status = ?", ["active"]),
    countRows(db, "SELECT COUNT(*) as count FROM tasks WHERE status != ?", ["done"]),
    countRows(db, "SELECT COUNT(*) as count FROM memory_items WHERE status = ?", ["active"]),
    countRows(db, "SELECT COUNT(*) as count FROM decisions"),
    allRows<Reminder>(
      db,
      "SELECT id, title, notes, remind_at, status, created_at, updated_at FROM reminders WHERE status = ? AND remind_at IS NOT NULL ORDER BY remind_at ASC LIMIT 5",
      ["pending"],
    ),
    allRows<Project>(
      db,
      `SELECT ${projectColumns} FROM projects ORDER BY updated_at DESC LIMIT 5`,
    ),
    allRows<Task>(
      db,
      `SELECT ${taskColumns} FROM tasks WHERE status != ? ORDER BY ${priorityOrderSql}, COALESCE(due_date, '9999-12-31'), updated_at DESC LIMIT 6`,
      ["done"],
    ),
    allRows<MemoryItem>(
      db,
      `SELECT ${memoryColumns} FROM memory_items ORDER BY updated_at DESC LIMIT 5`,
    ),
    allRows<Decision>(
      db,
      `SELECT ${decisionColumns} FROM decisions ORDER BY decided_at DESC LIMIT 5`,
    ),
  ]);

  return success({
    activeProjectsCount,
    openTasksCount,
    activeMemoryCount,
    decisionsCount,
    upcomingReminders,
    recentProjects,
    priorityTasks,
    recentMemory,
    recentDecisions,
  });
}

async function listProjects(db: D1Database): Promise<Response> {
  const projects = await allRows<Project>(
    db,
    `SELECT ${projectColumns} FROM projects ORDER BY updated_at DESC`,
  );

  return success(projects);
}

async function createProject(request: Request, db: D1Database): Promise<Response> {
  const payload = await readJson(request);
  const createdAt = nowIso();
  const project: Project = {
    id: newId("project"),
    name: requiredString(payload, "name"),
    objective: optionalString(payload, "objective"),
    status: optionalString(payload, "status") ?? "active",
    phase: optionalString(payload, "phase"),
    priority: optionalString(payload, "priority") ?? "P2",
    created_at: createdAt,
    updated_at: createdAt,
  };

  await prepare(
    db,
    "INSERT INTO projects (id, name, objective, status, phase, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      project.id,
      project.name,
      project.objective,
      project.status,
      project.phase,
      project.priority,
      project.created_at,
      project.updated_at,
    ],
  ).run();

  return success(project, { status: 201 });
}

async function listTasks(request: Request, db: D1Database): Promise<Response> {
  const url = new URL(request.url);
  const clauses: string[] = [];
  const values: D1Value[] = [];
  const projectId = url.searchParams.get("project_id");
  const status = url.searchParams.get("status");

  if (projectId) {
    clauses.push("project_id = ?");
    values.push(projectId);
  }

  if (status) {
    clauses.push("status = ?");
    values.push(status);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const tasks = await allRows<Task>(
    db,
    `SELECT ${taskColumns} FROM tasks ${whereSql} ORDER BY ${priorityOrderSql}, COALESCE(due_date, '9999-12-31'), updated_at DESC`,
    values,
  );

  return success(tasks);
}

async function createTask(request: Request, db: D1Database): Promise<Response> {
  const payload = await readJson(request);
  const createdAt = nowIso();
  const task: Task = {
    id: newId("task"),
    project_id: optionalString(payload, "project_id"),
    title: requiredString(payload, "title"),
    description: optionalString(payload, "description"),
    status: optionalString(payload, "status") ?? "todo",
    priority: optionalString(payload, "priority") ?? "P2",
    due_date: optionalString(payload, "due_date"),
    created_at: createdAt,
    updated_at: createdAt,
  };

  await prepare(
    db,
    "INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      task.id,
      task.project_id,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.due_date,
      task.created_at,
      task.updated_at,
    ],
  ).run();

  return success(task, { status: 201 });
}

async function listMemory(request: Request, db: D1Database): Promise<Response> {
  const url = new URL(request.url);
  const clauses: string[] = [];
  const values: D1Value[] = [];
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const query = url.searchParams.get("q");

  if (type) {
    clauses.push("type = ?");
    values.push(type);
  }

  if (status) {
    clauses.push("status = ?");
    values.push(status);
  }

  if (query) {
    clauses.push("(title LIKE ? OR content LIKE ? OR summary LIKE ?)");
    const likeQuery = `%${query}%`;
    values.push(likeQuery, likeQuery, likeQuery);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const memory = await allRows<MemoryItem>(
    db,
    `SELECT ${memoryColumns} FROM memory_items ${whereSql} ORDER BY updated_at DESC`,
    values,
  );

  return success(memory);
}

async function createMemory(request: Request, db: D1Database): Promise<Response> {
  const payload = await readJson(request);
  const createdAt = nowIso();
  const memory: MemoryItem = {
    id: newId("memory"),
    type: requiredString(payload, "type"),
    title: requiredString(payload, "title"),
    content: requiredString(payload, "content"),
    summary: optionalString(payload, "summary"),
    source: optionalString(payload, "source") ?? "manual",
    priority: optionalString(payload, "priority") ?? "P2",
    status: optionalString(payload, "status") ?? "active",
    confidence: optionalNumber(payload, "confidence", 1),
    expires_at: optionalString(payload, "expires_at"),
    last_used_at: null,
    created_at: createdAt,
    updated_at: createdAt,
  };

  await prepare(
    db,
    "INSERT INTO memory_items (id, type, title, content, summary, source, priority, status, confidence, expires_at, last_used_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      memory.id,
      memory.type,
      memory.title,
      memory.content,
      memory.summary,
      memory.source,
      memory.priority,
      memory.status,
      memory.confidence,
      memory.expires_at,
      memory.last_used_at,
      memory.created_at,
      memory.updated_at,
    ],
  ).run();

  return success(memory, { status: 201 });
}

async function listDecisions(request: Request, db: D1Database): Promise<Response> {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  const values: D1Value[] = [];
  let whereSql = "";

  if (projectId) {
    whereSql = "WHERE project_id = ?";
    values.push(projectId);
  }

  const decisions = await allRows<Decision>(
    db,
    `SELECT ${decisionColumns} FROM decisions ${whereSql} ORDER BY decided_at DESC`,
    values,
  );

  return success(decisions);
}

async function createDecision(request: Request, db: D1Database): Promise<Response> {
  const payload = await readJson(request);
  const createdAt = nowIso();
  const decision: Decision = {
    id: newId("decision"),
    project_id: optionalString(payload, "project_id"),
    title: requiredString(payload, "title"),
    reason: optionalString(payload, "reason"),
    impact: optionalString(payload, "impact"),
    decided_at: createdAt,
    created_at: createdAt,
    updated_at: createdAt,
  };

  await prepare(
    db,
    "INSERT INTO decisions (id, project_id, title, reason, impact, decided_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      decision.id,
      decision.project_id,
      decision.title,
      decision.reason,
      decision.impact,
      decision.decided_at,
      decision.created_at,
      decision.updated_at,
    ],
  ).run();

  return success(decision, { status: 201 });
}

async function route(context: PagesContext): Promise<Response> {
  const path = getPath(context.params);
  const method = context.request.method.toUpperCase();

  if (method === "OPTIONS") {
    return json({ ok: true });
  }

  const db = getDb(context.env);

  if (path === "/health" && method === "GET") {
    return handleHealth(db);
  }

  if (path === "/dashboard" && method === "GET") {
    return handleDashboard(db);
  }

  if (path === "/projects" && method === "GET") {
    return listProjects(db);
  }

  if (path === "/projects" && method === "POST") {
    return createProject(context.request, db);
  }

  if (path === "/tasks" && method === "GET") {
    return listTasks(context.request, db);
  }

  if (path === "/tasks" && method === "POST") {
    return createTask(context.request, db);
  }

  if (path === "/memory" && method === "GET") {
    return listMemory(context.request, db);
  }

  if (path === "/memory" && method === "POST") {
    return createMemory(context.request, db);
  }

  if (path === "/decisions" && method === "GET") {
    return listDecisions(context.request, db);
  }

  if (path === "/decisions" && method === "POST") {
    return createDecision(context.request, db);
  }

  return notFound();
}

export async function onRequest(context: PagesContext): Promise<Response> {
  try {
    return await route(context);
  } catch (caughtError) {
    if (caughtError instanceof HttpError) {
      return error(caughtError.message, caughtError.status);
    }

    console.error("Unhandled API error", caughtError);
    return error("Internal server error", 500);
  }
}
