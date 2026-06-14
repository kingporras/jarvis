import type { ReactNode } from "react";
import { Badge } from "./Badge";

interface EmptyStateProps {
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
}

export function EmptyState({ title, description, badge, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {badge ? <Badge tone="info">{badge}</Badge> : null}
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children ? <div className="empty-state__actions">{children}</div> : null}
    </div>
  );
}
