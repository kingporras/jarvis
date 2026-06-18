import type { ReactNode } from "react";

interface SectionHeaderProps {
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}

export function SectionHeader({ action, description, eyebrow, title }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="section-header__action">{action}</div> : null}
    </div>
  );
}
