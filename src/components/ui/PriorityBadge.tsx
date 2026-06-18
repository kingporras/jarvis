import type { Priority } from "../../types/jarvis";
import { Badge } from "./Badge";

const priorityTone: Record<Priority, "neutral" | "info" | "success" | "warning"> = {
  P0: "warning",
  P1: "warning",
  P2: "info",
  P3: "neutral",
  P4: "success",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={priorityTone[priority]}>{priority}</Badge>;
}
