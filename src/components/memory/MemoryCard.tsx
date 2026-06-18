import type { JarvisMemory } from "../../types/jarvis";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusBadge } from "../ui/StatusBadge";

const typeLabels: Record<JarvisMemory["type"], string> = {
  personal: "Personal",
  project: "Proyecto",
  decision: "Decision",
  preference: "Preferencia",
  knowledge: "Conocimiento",
  temporal: "Temporal",
};

export function MemoryCard({ memory }: { memory: JarvisMemory }) {
  return (
    <article className="memory-card">
      <div className="memory-card__top">
        <span>{typeLabels[memory.type]}</span>
        <PriorityBadge priority={memory.priority} />
      </div>
      <h3>{memory.title}</h3>
      <p>{memory.summary}</p>
      <div className="memory-card__meta">
        <StatusBadge status={memory.status} />
        <span>{memory.updatedAt}</span>
      </div>
      {memory.projectName ? <small>Relacionado con: {memory.projectName}</small> : null}
    </article>
  );
}
