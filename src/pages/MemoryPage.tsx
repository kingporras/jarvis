import { useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { MemoryCard } from "../components/memory/MemoryCard";
import { DemoNotice } from "../components/ui/DemoNotice";
import { FilterChipGroup } from "../components/ui/FilterChipGroup";
import { SectionHeader } from "../components/ui/SectionHeader";
import { memories } from "../data/mockJarvisData";
import type { MemoryStatus, MemoryType, Priority } from "../types/jarvis";

type TypeFilter = "all" | MemoryType;
type PriorityFilter = "all" | Priority;
type StatusFilter = "all" | MemoryStatus;

export function MemoryPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredMemories = useMemo(
    () =>
      memories.filter((memory) => {
        const typeMatches = typeFilter === "all" || memory.type === typeFilter;
        const priorityMatches = priorityFilter === "all" || memory.priority === priorityFilter;
        const statusMatches = statusFilter === "all" || memory.status === statusFilter;
        return typeMatches && priorityMatches && statusMatches;
      }),
    [priorityFilter, statusFilter, typeFilter],
  );

  return (
    <div className="page-stack">
      <PageHeader
        description="El reactor arc de JARVIS: contexto importante, editable y utilizable en una fase posterior."
        eyebrow="Datos de demostracion"
        title="Memoria"
      />

      <DemoNotice>
        La memoria editable sera el reactor arc de JARVIS. Los cambios todavia no se guardan.
      </DemoNotice>

      <section className="filter-board" aria-label="Filtros de memoria">
        <FilterChipGroup
          label="Tipo"
          onChange={setTypeFilter}
          options={[
            { label: "Todos", value: "all" },
            { label: "Personal", value: "personal" },
            { label: "Proyecto", value: "project" },
            { label: "Decision", value: "decision" },
            { label: "Preferencia", value: "preference" },
            { label: "Conocimiento", value: "knowledge" },
            { label: "Temporal", value: "temporal" },
          ]}
          value={typeFilter}
        />
        <FilterChipGroup
          label="Prioridad"
          onChange={setPriorityFilter}
          options={[
            { label: "Todas", value: "all" },
            { label: "P0", value: "P0" },
            { label: "P1", value: "P1" },
            { label: "P2", value: "P2" },
            { label: "P3", value: "P3" },
            { label: "P4", value: "P4" },
          ]}
          value={priorityFilter}
        />
        <FilterChipGroup
          label="Estado"
          onChange={setStatusFilter}
          options={[
            { label: "Todos", value: "all" },
            { label: "Activa", value: "active" },
            { label: "Revision", value: "needs_review" },
            { label: "Archivada", value: "archived" },
            { label: "Temporal", value: "temporal" },
          ]}
          value={statusFilter}
        />
      </section>

      <SectionHeader
        action={<span className="text-muted">{filteredMemories.length} memorias visibles</span>}
        title="Contexto estructurado"
      />

      <section className="memory-card-grid">
        {filteredMemories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </section>
    </div>
  );
}
