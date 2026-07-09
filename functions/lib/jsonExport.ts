import { allRows } from "./db";
import { json } from "./responses";
import type { D1Database } from "./types";

interface ProjectRow {
  id: string;
  name: string;
  objective: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
}

interface TaskRow {
  id: string;
  project_id: string | null;
  project_name: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface MemoryRow {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  status: string;
  source: string;
  confidence: number | null;
  expires_at: string | null;
  review_due_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface MemoryLinkRow {
  id: string;
  source_memory_id: string;
  target_type: string;
  target_id: string;
  target_title: string | null;
  target_status: string | null;
  relation: string | null;
  created_at: string;
}

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
  status: string;
  priority: string;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface PersonRow {
  id: string;
  name: string;
  role: string | null;
  relationship: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface ReminderRow {
  id: string;
  title: string;
  notes: string | null;
  remind_at: string | null;
  due_at: string | null;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  dismissed_at: string | null;
}

interface ActionExecutionRow {
  id: string;
  action_type: string;
  source_request_id: string | null;
  proposal_id: string | null;
  status: string;
  target_type: string | null;
  target_id: string | null;
  summary: string;
  warnings_json: string | null;
  error_code: string | null;
  created_at: string;
}

const FORBIDDEN_TEXT =
  /\b(owner_subject|jwt|claims|api[_ -]?key|secret|token|prompt|email|config(?:uracion)?(?: interna)?)\b/gi;
const EMAIL_TEXT = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function noStore(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

function sanitizeText(value: string): string {
  return value.replace(FORBIDDEN_TEXT, "[redacted]").replace(EMAIL_TEXT, "[redacted]");
}

function toWarnings(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((warning): warning is string => typeof warning === "string")
      .map((warning) => sanitizeText(warning.trim()))
      .filter(Boolean)
      .slice(0, 6);
  } catch {
    return [];
  }
}

function toProject(row: ProjectRow) {
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

function toTask(row: TaskRow) {
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

function toMemory(row: MemoryRow) {
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

function toMemoryLink(row: MemoryLinkRow) {
  return {
    id: row.id,
    sourceMemoryId: row.source_memory_id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetTitle: row.target_title,
    targetStatus: row.target_status,
    relation: row.relation,
    createdAt: row.created_at,
  };
}

function toDecision(row: DecisionRow) {
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

function toPerson(row: PersonRow) {
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

function toReminder(row: ReminderRow) {
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

function toActionExecution(row: ActionExecutionRow) {
  return {
    id: row.id,
    actionType: row.action_type,
    sourceRequestId: row.source_request_id,
    proposalId: row.proposal_id,
    status: row.status,
    targetType: row.target_type,
    targetId: row.target_id,
    summary: sanitizeText(row.summary),
    warnings: toWarnings(row.warnings_json),
    errorCode: row.error_code,
    createdAt: row.created_at,
  };
}

export async function getJsonExport(db: D1Database, ownerSubject: string): Promise<Response> {
  const [
    projectRows,
    taskRows,
    memoryRows,
    memoryLinkRows,
    decisionRows,
    personRows,
    reminderRows,
    actionExecutionRows,
  ] = await Promise.all([
    allRows<ProjectRow>(
      db,
      `SELECT id, name, objective, status, priority, created_at, updated_at, completed_at, archived_at
       FROM projects
       WHERE owner_subject = ?
       ORDER BY updated_at DESC, id ASC`,
      [ownerSubject],
    ),
    allRows<TaskRow>(
      db,
      `SELECT
         tasks.id,
         tasks.project_id,
         projects.name AS project_name,
         tasks.title,
         tasks.description,
         tasks.status,
         tasks.priority,
         tasks.due_date,
         tasks.created_at,
         tasks.updated_at,
         tasks.completed_at
       FROM tasks
       LEFT JOIN projects
         ON projects.id = tasks.project_id
        AND projects.owner_subject = tasks.owner_subject
       WHERE tasks.owner_subject = ?
       ORDER BY tasks.updated_at DESC, tasks.id ASC`,
      [ownerSubject],
    ),
    allRows<MemoryRow>(
      db,
      `SELECT
         id,
         title,
         content,
         type,
         priority,
         status,
         source,
         confidence,
         expires_at,
         review_due_at,
         last_reviewed_at,
         created_at,
         updated_at,
         archived_at
       FROM memory_items
       WHERE owner_subject = ?
       ORDER BY updated_at DESC, id ASC`,
      [ownerSubject],
    ),
    allRows<MemoryLinkRow>(
      db,
      `SELECT
         memory_links.id,
         memory_links.source_memory_id,
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
         memory_links.relation,
         memory_links.created_at
       FROM memory_links
       INNER JOIN memory_items
         ON memory_items.id = memory_links.source_memory_id
        AND memory_items.owner_subject = ?
       LEFT JOIN projects
         ON memory_links.target_type = 'project'
        AND projects.id = memory_links.target_id
        AND projects.owner_subject = ?
       LEFT JOIN tasks
         ON memory_links.target_type = 'task'
        AND tasks.id = memory_links.target_id
        AND tasks.owner_subject = ?
       ORDER BY memory_links.created_at DESC, memory_links.id ASC`,
      [ownerSubject, ownerSubject, ownerSubject],
    ),
    allRows<DecisionRow>(
      db,
      `SELECT
         decisions.id,
         decisions.project_id,
         projects.name AS project_name,
         decisions.title,
         decisions.context,
         decisions.outcome,
         decisions.rationale,
         decisions.reason,
         decisions.impact,
         decisions.status,
         decisions.priority,
         decisions.decided_at,
         decisions.created_at,
         decisions.updated_at,
         decisions.archived_at
       FROM decisions
       LEFT JOIN projects
         ON projects.id = decisions.project_id
        AND projects.owner_subject = decisions.owner_subject
       WHERE decisions.owner_subject = ?
       ORDER BY decisions.updated_at DESC, decisions.id ASC`,
      [ownerSubject],
    ),
    allRows<PersonRow>(
      db,
      `SELECT id, name, role, relationship, notes, status, created_at, updated_at, archived_at
       FROM persons
       WHERE owner_subject = ?
       ORDER BY updated_at DESC, id ASC`,
      [ownerSubject],
    ),
    allRows<ReminderRow>(
      db,
      `SELECT id, title, notes, remind_at, due_at, priority, status, created_at, updated_at, completed_at, dismissed_at
       FROM reminders
       WHERE owner_subject = ?
       ORDER BY updated_at DESC, id ASC`,
      [ownerSubject],
    ),
    allRows<ActionExecutionRow>(
      db,
      `SELECT
         id,
         action_type,
         source_request_id,
         proposal_id,
         status,
         target_type,
         target_id,
         summary,
         warnings_json,
         error_code,
         created_at
       FROM action_executions
       WHERE owner_subject = ?
       ORDER BY created_at DESC, id ASC`,
      [ownerSubject],
    ),
  ]);

  return json(
    {
      ok: true,
      exportedAt: new Date().toISOString(),
      version: 1,
      data: {
        projects: projectRows.map(toProject),
        tasks: taskRows.map(toTask),
        memory: memoryRows.map(toMemory),
        memoryLinks: memoryLinkRows.map(toMemoryLink),
        decisions: decisionRows.map(toDecision),
        persons: personRows.map(toPerson),
        reminders: reminderRows.map(toReminder),
        actionExecutions: actionExecutionRows.map(toActionExecution),
      },
    },
    { headers: noStore() },
  );
}
