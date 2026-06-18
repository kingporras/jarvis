import type { JarvisProject } from "../../types/jarvis";
import { PriorityBadge } from "../ui/PriorityBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { StatusBadge } from "../ui/StatusBadge";

interface ProjectSummaryCardProps {
  isSelected?: boolean;
  onSelect?: () => void;
  project: JarvisProject;
}

export function ProjectSummaryCard({ isSelected = false, onSelect, project }: ProjectSummaryCardProps) {
  const content = (
    <>
      <div className="project-summary-card__top">
        <div>
          <h3>{project.name}</h3>
          <p>{project.phase}</p>
        </div>
        <PriorityBadge priority={project.priority} />
      </div>
      <div className="badge-row">
        <StatusBadge status={project.status} />
        <span>{project.updatedAt}</span>
      </div>
      <ProgressBar value={project.progress} />
      <p className="compact-copy">{project.nextAction}</p>
      <small>Riesgo: {project.risk}</small>
    </>
  );

  if (onSelect) {
    return (
      <button
        aria-pressed={isSelected}
        className={isSelected ? "project-summary-card project-summary-card--selected" : "project-summary-card"}
        onClick={onSelect}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <article className="project-summary-card">{content}</article>;
}
