import type { JarvisTask } from "../../types/jarvis";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusBadge } from "../ui/StatusBadge";

export function TaskRow({ task }: { task: JarvisTask }) {
  return (
    <article className={task.priority === "P0" || task.priority === "P1" ? "task-row task-row--urgent" : "task-row"}>
      <div>
        <h3>{task.title}</h3>
        <p>{task.context}</p>
      </div>
      <div className="task-row__meta">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
        <span>{task.projectName}</span>
        <strong>{task.dueLabel}</strong>
      </div>
    </article>
  );
}
