export type Priority = "P0" | "P1" | "P2" | "P3" | "P4";

export type ProjectStatus = "active" | "planning" | "paused" | "completed";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type DecisionStatus = "active" | "needs_review" | "superseded";
export type ReminderStatus = "upcoming" | "done";

export type MemoryType =
  | "personal"
  | "project"
  | "decision"
  | "preference"
  | "knowledge"
  | "temporal";

export type MemoryStatus = "active" | "needs_review" | "archived" | "temporal";
export type TaskLane = "today" | "upcoming" | "in_progress" | "done";
export type ChatAuthor = "Victor" | "JARVIS";
export type ArcCoreState = "idle" | "focus" | "active" | "blocked" | "calm";

export interface DailyMetric {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "info" | "success" | "warning";
}

export interface QuickAction {
  label: string;
  description: string;
  route?: string;
  demoMessage?: string;
}

export interface JarvisProject {
  id: string;
  name: string;
  objective: string;
  status: ProjectStatus;
  phase: string;
  priority: Priority;
  progress: number;
  nextAction: string;
  risk: string;
  taskCount: number;
  decisionCount: number;
  linkedMemory: string;
  updatedAt: string;
}

export interface JarvisTask {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  priority: Priority;
  status: TaskStatus;
  lane: TaskLane;
  dueLabel: string;
  context: string;
}

export interface JarvisDecision {
  id: string;
  title: string;
  status: DecisionStatus;
  impact: string;
  reason: string;
  projectName: string;
  priority: Priority;
  dateLabel: string;
  nextReview: string;
}

export interface JarvisMemory {
  id: string;
  type: MemoryType;
  title: string;
  summary: string;
  priority: Priority;
  status: MemoryStatus;
  projectName?: string;
  updatedAt: string;
}

export interface JarvisPerson {
  id: string;
  name: string;
  role: string;
  relation: string;
  context: string;
  lastInteraction: string;
}

export interface JarvisReminder {
  id: string;
  title: string;
  timeLabel: string;
  context: string;
  status: ReminderStatus;
  priority: Priority;
}

export interface ChatMessage {
  id: string;
  author: ChatAuthor;
  text: string;
}

export interface SystemStatus {
  state: ArcCoreState;
  general: string;
  focus: string;
  priority: Priority;
  activity: string;
  security: string;
  memory: string;
  note: string;
}
