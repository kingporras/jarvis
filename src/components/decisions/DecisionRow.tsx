import type { JarvisDecision } from "../../types/jarvis";
import { Card } from "../ui/Card";
import { PriorityBadge } from "../ui/PriorityBadge";
import { StatusBadge } from "../ui/StatusBadge";

export function DecisionRow({ decision }: { decision: JarvisDecision }) {
  return (
    <Card className="decision-row">
      <div className="decision-row__title">
        <div>
          <h3>{decision.title}</h3>
          <p>{decision.reason}</p>
        </div>
        <PriorityBadge priority={decision.priority} />
      </div>
      <div className="decision-row__grid">
        <span>
          Estado
          <StatusBadge status={decision.status} />
        </span>
        <span>
          Impacto
          <strong>{decision.impact}</strong>
        </span>
        <span>
          Proyecto
          <strong>{decision.projectName}</strong>
        </span>
        <span>
          Revision
          <strong>{decision.nextReview}</strong>
        </span>
      </div>
    </Card>
  );
}
