import { accessErrorResponse, isAccessIdentity, requireAccess, type AccessIdentity } from "../lib/access";
import { allRows, countRows, firstRow, getDb } from "../lib/db";
import {
  createDecision as createOwnedDecision,
  listDecisions as listOwnedDecisions,
  updateDecision as updateOwnedDecision,
} from "../lib/decisions";
import {
  createMemoryLink as createOwnedMemoryLink,
  createMemory as createOwnedMemory,
  deleteMemoryLink as deleteOwnedMemoryLink,
  listMemoryLinks as listOwnedMemoryLinks,
  listMemory as listOwnedMemory,
  reviewMemory as reviewOwnedMemory,
  updateMemory as updateOwnedMemory,
} from "../lib/memory";
import {
  createPerson as createOwnedPerson,
  listPersons as listOwnedPersons,
  updatePerson as updateOwnedPerson,
} from "../lib/persons";
import {
  createProject as createOwnedProject,
  listProjects as listOwnedProjects,
  updateProject as updateOwnedProject,
} from "../lib/projects";
import { error, HttpError, json, notFound, success } from "../lib/responses";
import {
  createTask as createOwnedTask,
  listTasks as listOwnedTasks,
  updateTask as updateOwnedTask,
} from "../lib/tasks";
import type { D1Database, PagesContext } from "../lib/types";

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

function nowIso(): string {
  return new Date().toISOString();
}

function getPath(params: PagesContext["params"]): string {
  const rawPath = params.path;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : rawPath ?? "";
  return `/${path}`.replace(/\/+/g, "/");
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

function noStoreHeaders(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

function legacyAuthRetired(): Response {
  return error("Authentication endpoint retired", 410, {
    headers: noStoreHeaders(),
  });
}

async function getAccessIdentity(context: PagesContext): Promise<AccessIdentity> {
  const identity = context.data?.accessIdentity;

  if (isAccessIdentity(identity)) {
    return identity;
  }

  return requireAccess(context.request, context.env);
}

async function handleAccessMe(context: PagesContext): Promise<Response> {
  const identity = await getAccessIdentity(context);

  return json(
    identity.email
      ? {
          authenticated: true,
          subject: identity.subject,
          email: identity.email,
        }
      : {
          authenticated: true,
          subject: identity.subject,
        },
    {
      headers: noStoreHeaders(),
    },
  );
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

async function route(context: PagesContext): Promise<Response> {
  const path = getPath(context.params);
  const method = context.request.method.toUpperCase();

  if (method === "OPTIONS") {
    return json({ ok: true });
  }

  if (path.startsWith("/auth/")) {
    return legacyAuthRetired();
  }

  if (path === "/health" && method === "GET") {
    const db = getDb(context.env);
    return handleHealth(db);
  }

  if (path === "/access/me" && method === "GET") {
    return handleAccessMe(context);
  }

  let identity: AccessIdentity;

  try {
    identity = await getAccessIdentity(context);
  } catch (caughtError) {
    return accessErrorResponse(caughtError);
  }

  const db = getDb(context.env);

  if (path === "/dashboard" && method === "GET") {
    return handleDashboard(db);
  }

  if (path === "/projects" && method === "GET") {
    return listOwnedProjects(db, identity.subject);
  }

  if (path === "/projects" && method === "POST") {
    return createOwnedProject(context.request, db, identity.subject);
  }

  if (path.startsWith("/projects/") && method === "PATCH") {
    const projectId = decodeURIComponent(path.slice("/projects/".length));
    return updateOwnedProject(context.request, db, identity.subject, projectId);
  }

  if (path === "/tasks" && method === "GET") {
    return listOwnedTasks(db, identity.subject);
  }

  if (path === "/tasks" && method === "POST") {
    return createOwnedTask(context.request, db, identity.subject);
  }

  if (path.startsWith("/tasks/") && method === "PATCH") {
    const taskId = decodeURIComponent(path.slice("/tasks/".length));
    return updateOwnedTask(context.request, db, identity.subject, taskId);
  }

  if (path === "/memory" && method === "GET") {
    return listOwnedMemory(context.request, db, identity.subject);
  }

  if (path === "/memory" && method === "POST") {
    return createOwnedMemory(context.request, db, identity.subject);
  }

  const memoryLinksMatch = path.match(/^\/memory\/([^/]+)\/links$/);
  if (memoryLinksMatch && method === "GET") {
    const memoryId = decodeURIComponent(memoryLinksMatch[1]);
    return listOwnedMemoryLinks(db, identity.subject, memoryId);
  }

  if (memoryLinksMatch && method === "POST") {
    const memoryId = decodeURIComponent(memoryLinksMatch[1]);
    return createOwnedMemoryLink(context.request, db, identity.subject, memoryId);
  }

  const memoryLinkDeleteMatch = path.match(/^\/memory\/([^/]+)\/links\/([^/]+)$/);
  if (memoryLinkDeleteMatch && method === "DELETE") {
    const memoryId = decodeURIComponent(memoryLinkDeleteMatch[1]);
    const linkId = decodeURIComponent(memoryLinkDeleteMatch[2]);
    return deleteOwnedMemoryLink(context.request, db, identity.subject, memoryId, linkId);
  }

  const memoryReviewMatch = path.match(/^\/memory\/([^/]+)\/review$/);
  if (memoryReviewMatch && method === "POST") {
    const memoryId = decodeURIComponent(memoryReviewMatch[1]);
    return reviewOwnedMemory(context.request, db, identity.subject, memoryId);
  }

  if (path.startsWith("/memory/") && method === "PATCH") {
    const memoryId = decodeURIComponent(path.slice("/memory/".length));
    return updateOwnedMemory(context.request, db, identity.subject, memoryId);
  }

  if (path === "/decisions" && method === "GET") {
    return listOwnedDecisions(context.request, db, identity.subject);
  }

  if (path === "/decisions" && method === "POST") {
    return createOwnedDecision(context.request, db, identity.subject);
  }

  if (path.startsWith("/decisions/") && method === "PATCH") {
    const decisionId = decodeURIComponent(path.slice("/decisions/".length));
    return updateOwnedDecision(context.request, db, identity.subject, decisionId);
  }

  if (path === "/persons" && method === "GET") {
    return listOwnedPersons(context.request, db, identity.subject);
  }

  if (path === "/persons" && method === "POST") {
    return createOwnedPerson(context.request, db, identity.subject);
  }

  if (path.startsWith("/persons/") && method === "PATCH") {
    const personId = decodeURIComponent(path.slice("/persons/".length));
    return updateOwnedPerson(context.request, db, identity.subject, personId);
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
