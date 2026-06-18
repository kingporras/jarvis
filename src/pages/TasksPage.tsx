import { useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { TaskRow } from "../components/tasks/TaskRow";
import { Badge } from "../components/ui/Badge";
import { FilterChipGroup } from "../components/ui/FilterChipGroup";
import { SectionHeader } from "../components/ui/SectionHeader";
import { tasks } from "../data/mockJarvisData";
import type { TaskLane } from "../types/jarvis";

export function TasksPage() {
  const [lane, setLane] = useState<TaskLane>("today");
  const visibleTasks = useMemo(() => tasks.filter((task) => task.lane === lane), [lane]);

  return (
    <div className="page-stack">
      <PageHeader
        description="Lectura rapida por prioridad, estado, proyecto y fecha mock. Nada se persiste."
        eyebrow="Ejecucion local"
        title="Tareas"
      />

      <FilterChipGroup
        label="Vista"
        onChange={setLane}
        options={[
          { label: "Hoy", value: "today" },
          { label: "Proximas", value: "upcoming" },
          { label: "En curso", value: "in_progress" },
          { label: "Completadas mock", value: "done" },
        ]}
        value={lane}
      />

      <SectionHeader
        action={<Badge tone="info">{visibleTasks.length} visibles</Badge>}
        description="Los estados son estaticos para evitar confundir demo con gestion real."
        title="Cola de ejecucion"
      />

      <section className="task-list">
        {visibleTasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </section>
    </div>
  );
}
