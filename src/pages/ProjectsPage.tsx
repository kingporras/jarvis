import { useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { ProjectSummaryCard } from "../components/projects/ProjectSummaryCard";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { DemoNotice } from "../components/ui/DemoNotice";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { projects } from "../data/mockJarvisData";

export function ProjectsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0],
    [selectedProjectId],
  );

  return (
    <div className="page-stack">
      <PageHeader
        description="Proyectos como unidades de ejecucion con contexto, no solo como una lista."
        eyebrow="Mock local"
        title="Proyectos"
      />

      <section className="summary-strip" aria-label="Resumen de proyectos">
        <Badge tone="info">{projects.length} proyectos visibles</Badge>
        <Badge tone="warning">1 prioridad P0</Badge>
        <Badge>1 proyecto en espera</Badge>
      </section>

      <section className="project-workspace">
        <div className="project-selector">
          {projects.map((project) => (
            <ProjectSummaryCard
              isSelected={selectedProject?.id === project.id}
              key={project.id}
              onSelect={() => setSelectedProjectId(project.id)}
              project={project}
            />
          ))}
        </div>

        {selectedProject ? (
          <Card className="project-detail-panel">
            <SectionHeader
              action={<PriorityBadge priority={selectedProject.priority} />}
              description={selectedProject.objective}
              eyebrow="Detalle mock"
              title={selectedProject.name}
            />
            <div className="badge-row">
              <StatusBadge status={selectedProject.status} />
              <Badge tone="info">{selectedProject.phase}</Badge>
              <span>{selectedProject.updatedAt}</span>
            </div>
            <ProgressBar value={selectedProject.progress} />
            <div className="detail-grid">
              <article>
                <span>Proximo paso</span>
                <strong>{selectedProject.nextAction}</strong>
              </article>
              <article>
                <span>Tareas asociadas</span>
                <strong>{selectedProject.taskCount}</strong>
              </article>
              <article>
                <span>Decisiones relacionadas</span>
                <strong>{selectedProject.decisionCount}</strong>
              </article>
              <article>
                <span>Riesgo</span>
                <strong>{selectedProject.risk}</strong>
              </article>
            </div>
            <DemoNotice>Memoria vinculada: {selectedProject.linkedMemory}</DemoNotice>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
