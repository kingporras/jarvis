import type {
  DecisionStatus,
  MemoryStatus,
  ProjectStatus,
  ReminderStatus,
  TaskStatus,
} from "../../types/jarvis";
import { Badge } from "./Badge";

type Status = ProjectStatus | TaskStatus | DecisionStatus | MemoryStatus | ReminderStatus;

const labels: Record<Status, string> = {
  active: "Activo",
  planning: "Planificacion",
  paused: "En espera",
  completed: "Completado",
  todo: "Por hacer",
  in_progress: "En curso",
  blocked: "Bloqueado",
  done: "Hecho",
  needs_review: "Revision",
  superseded: "Superada",
  archived: "Archivada",
  temporal: "Temporal",
  upcoming: "Proximo",
};

const tones: Record<Status, "neutral" | "info" | "success" | "warning"> = {
  active: "success",
  planning: "info",
  paused: "neutral",
  completed: "success",
  todo: "neutral",
  in_progress: "info",
  blocked: "warning",
  done: "success",
  needs_review: "warning",
  superseded: "neutral",
  archived: "neutral",
  temporal: "info",
  upcoming: "info",
};

export function StatusBadge({ status }: { status: Status }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}
