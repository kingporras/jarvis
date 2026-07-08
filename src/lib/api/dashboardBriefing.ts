import type { DecisionStatus, MemoryType, Priority, ProjectStatus, TaskStatus } from "../../types/jarvis";

export type TaskSelectionReason = "overdue" | "in_progress" | "high_priority" | "nearest_due_date";
export type MemoryAttentionReason = "expired" | "review_due";

export interface BriefingTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueAt: string | null;
  projectId: string | null;
  selectionReason: TaskSelectionReason;
}

export interface BriefingProject {
  id: string;
  name: string;
  status: ProjectStatus;
  priority: Priority;
  updatedAt: string;
  openTaskCount: number;
}

export interface BriefingReminder {
  id: string;
  title: string;
  priority: Priority;
  dueAt: string;
}

export interface BriefingMemoryAttention {
  id: string;
  title: string;
  type: MemoryType;
  priority: Priority;
  expiresAt: string | null;
  reviewDueAt: string | null;
  attentionReasons: MemoryAttentionReason[];
}

export interface BriefingDecision {
  id: string;
  title: string;
  status: Extract<DecisionStatus, "open" | "decided">;
  priority: Priority;
  projectId: string | null;
  decidedAt: string | null;
  updatedAt: string;
}

export interface ExecutiveBriefing {
  generatedAt: string;
  nextBestAction: BriefingTask | null;
  keyTasks: BriefingTask[];
  activeProjects: BriefingProject[];
  reminders: {
    overdue: BriefingReminder[];
    upcoming: BriefingReminder[];
  };
  memoryAttention: BriefingMemoryAttention[];
  decisions: {
    open: BriefingDecision[];
    recentDecided: BriefingDecision[];
  };
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!payload || payload.ok !== true) {
    throw new Error(payload?.error ?? "No se pudo cargar el briefing ejecutivo.");
  }

  return payload.data;
}

export async function fetchExecutiveBriefing(): Promise<ExecutiveBriefing> {
  const response = await fetch("/api/dashboard/briefing");

  return parseResponse<ExecutiveBriefing>(response);
}
