import { allRows } from "./db";
import { success } from "./responses";
import type { D1Database } from "./types";

type SelectionReason = "overdue" | "in_progress" | "high_priority" | "nearest_due_date";
type AttentionReason = "expired" | "review_due";

interface TaskBriefingRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  project_id: string | null;
}

interface TaskBriefingItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  projectId: string | null;
  selectionReason: SelectionReason;
}

interface ProjectBriefingRow {
  id: string;
  name: string;
  status: string;
  priority: string;
  updated_at: string;
  open_task_count: number;
}

interface ProjectBriefingItem {
  id: string;
  name: string;
  status: string;
  priority: string;
  updatedAt: string;
  openTaskCount: number;
}

interface ReminderBriefingRow {
  id: string;
  title: string;
  priority: string;
  due_at: string;
}

interface ReminderBriefingItem {
  id: string;
  title: string;
  priority: string;
  dueAt: string;
}

interface MemoryAttentionRow {
  id: string;
  title: string;
  type: string;
  priority: string;
  expires_at: string | null;
  review_due_at: string | null;
}

interface MemoryAttentionItem {
  id: string;
  title: string;
  type: string;
  priority: string;
  expiresAt: string | null;
  reviewDueAt: string | null;
  attentionReasons: AttentionReason[];
}

interface DecisionBriefingRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  project_id: string | null;
  decided_at: string | null;
  updated_at: string;
}

interface DecisionBriefingItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId: string | null;
  decidedAt: string | null;
  updatedAt: string;
}

const priorityOrderSql =
  "CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END";
const projectPriorityOrderSql =
  "CASE projects.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END";

const taskActionOrderSql = `
  CASE
    WHEN due_date IS NOT NULL AND due_date < ? THEN 0
    WHEN status = 'in_progress' THEN 1
    ELSE 2
  END,
  ${priorityOrderSql},
  CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
  due_date ASC,
  updated_at ASC,
  id ASC
`;

function addDaysIso(isoDate: string, days: number): string {
  return new Date(new Date(isoDate).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function noStore(): HeadersInit {
  return { "Cache-Control": "no-store" };
}

function selectionReason(row: TaskBriefingRow, generatedAt: string): SelectionReason {
  if (row.due_at && row.due_at < generatedAt) {
    return "overdue";
  }

  if (row.status === "in_progress") {
    return "in_progress";
  }

  if (row.due_at) {
    return "nearest_due_date";
  }

  return "high_priority";
}

function toTaskItem(row: TaskBriefingRow, generatedAt: string): TaskBriefingItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    projectId: row.project_id,
    selectionReason: selectionReason(row, generatedAt),
  };
}

function toProjectItem(row: ProjectBriefingRow): ProjectBriefingItem {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    priority: row.priority,
    updatedAt: row.updated_at,
    openTaskCount: Number(row.open_task_count ?? 0),
  };
}

function toReminderItem(row: ReminderBriefingRow): ReminderBriefingItem {
  return {
    id: row.id,
    title: row.title,
    priority: row.priority,
    dueAt: row.due_at,
  };
}

function toMemoryAttentionItem(row: MemoryAttentionRow, generatedAt: string): MemoryAttentionItem {
  const attentionReasons: AttentionReason[] = [];

  if (row.expires_at && row.expires_at < generatedAt) {
    attentionReasons.push("expired");
  }

  if (row.review_due_at && row.review_due_at < generatedAt) {
    attentionReasons.push("review_due");
  }

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    priority: row.priority,
    expiresAt: row.expires_at,
    reviewDueAt: row.review_due_at,
    attentionReasons,
  };
}

function toDecisionItem(row: DecisionBriefingRow): DecisionBriefingItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    projectId: row.project_id,
    decidedAt: row.decided_at || null,
    updatedAt: row.updated_at,
  };
}

export async function getExecutiveBriefing(db: D1Database, ownerSubject: string): Promise<Response> {
  const generatedAt = new Date().toISOString();
  const upcomingUntil = addDaysIso(generatedAt, 7);

  const [
    taskRows,
    activeProjectRows,
    overdueReminderRows,
    upcomingReminderRows,
    memoryAttentionRows,
    openDecisionRows,
    recentDecidedRows,
  ] = await Promise.all([
    allRows<TaskBriefingRow>(
      db,
      `SELECT id, title, status, priority, due_date AS due_at, project_id
       FROM tasks
       WHERE owner_subject = ?
         AND status NOT IN ('done', 'blocked')
       ORDER BY ${taskActionOrderSql}
       LIMIT 4`,
      [ownerSubject, generatedAt],
    ),
    allRows<ProjectBriefingRow>(
      db,
      `SELECT
         projects.id,
         projects.name,
         projects.status,
         projects.priority,
         projects.updated_at,
         COUNT(tasks.id) AS open_task_count
       FROM projects
       LEFT JOIN tasks
         ON tasks.project_id = projects.id
        AND tasks.owner_subject = projects.owner_subject
        AND tasks.status != 'done'
       WHERE projects.owner_subject = ?
         AND projects.status = 'active'
       GROUP BY projects.id, projects.name, projects.status, projects.priority, projects.updated_at
       ORDER BY ${projectPriorityOrderSql}, projects.updated_at DESC, projects.id ASC
       LIMIT 5`,
      [ownerSubject],
    ),
    allRows<ReminderBriefingRow>(
      db,
      `SELECT id, title, priority, due_at
       FROM reminders
       WHERE owner_subject = ?
         AND status = 'pending'
         AND due_at IS NOT NULL
         AND due_at < ?
       ORDER BY due_at ASC, ${priorityOrderSql}, id ASC
       LIMIT 5`,
      [ownerSubject, generatedAt],
    ),
    allRows<ReminderBriefingRow>(
      db,
      `SELECT id, title, priority, due_at
       FROM reminders
       WHERE owner_subject = ?
         AND status = 'pending'
         AND due_at IS NOT NULL
         AND due_at >= ?
         AND due_at <= ?
       ORDER BY due_at ASC, ${priorityOrderSql}, id ASC
       LIMIT 5`,
      [ownerSubject, generatedAt, upcomingUntil],
    ),
    allRows<MemoryAttentionRow>(
      db,
      `SELECT id, title, type, priority, expires_at, review_due_at
       FROM memory_items
       WHERE owner_subject = ?
         AND status = 'active'
         AND (
           (expires_at IS NOT NULL AND expires_at < ?)
           OR (review_due_at IS NOT NULL AND review_due_at < ?)
         )
       ORDER BY ${priorityOrderSql}, updated_at ASC, id ASC
       LIMIT 10`,
      [ownerSubject, generatedAt, generatedAt],
    ),
    allRows<DecisionBriefingRow>(
      db,
      `SELECT id, title, status, priority, project_id, decided_at, updated_at
       FROM decisions
       WHERE owner_subject = ?
         AND status = 'open'
       ORDER BY ${priorityOrderSql}, updated_at ASC, id ASC
       LIMIT 5`,
      [ownerSubject],
    ),
    allRows<DecisionBriefingRow>(
      db,
      `SELECT id, title, status, priority, project_id, decided_at, updated_at
       FROM decisions
       WHERE owner_subject = ?
         AND status = 'decided'
       ORDER BY decided_at DESC, updated_at DESC, id ASC
       LIMIT 3`,
      [ownerSubject],
    ),
  ]);

  const taskItems = taskRows.map((row) => toTaskItem(row, generatedAt));
  const nextBestAction = taskItems[0] ?? null;

  return success(
    {
      generatedAt,
      nextBestAction,
      keyTasks: taskItems.slice(1, 4),
      activeProjects: activeProjectRows.map(toProjectItem),
      reminders: {
        overdue: overdueReminderRows.map(toReminderItem),
        upcoming: upcomingReminderRows.map(toReminderItem),
      },
      memoryAttention: memoryAttentionRows.map((row) => toMemoryAttentionItem(row, generatedAt)),
      decisions: {
        open: openDecisionRows.map(toDecisionItem),
        recentDecided: recentDecidedRows.map(toDecisionItem),
      },
    },
    { headers: noStore() },
  );
}
