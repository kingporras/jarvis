import { useMemo, useState } from "react";
import { DecisionRow } from "../components/decisions/DecisionRow";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { FilterChipGroup } from "../components/ui/FilterChipGroup";
import { SectionHeader } from "../components/ui/SectionHeader";
import { decisions } from "../data/mockJarvisData";
import type { DecisionStatus } from "../types/jarvis";

type DecisionFilter = "all" | DecisionStatus;

export function DecisionsPage() {
  const [status, setStatus] = useState<DecisionFilter>("all");
  const visibleDecisions = useMemo(
    () => decisions.filter((decision) => status === "all" || decision.status === status),
    [status],
  );

  return (
    <div className="page-stack">
      <PageHeader
        description="Decisiones como activos de conocimiento: motivo, impacto, proyecto y siguiente revision."
        eyebrow="Registro navegable"
        title="Decisiones"
      />

      <FilterChipGroup
        label="Estado"
        onChange={setStatus}
        options={[
          { label: "Todas", value: "all" },
          { label: "Activas", value: "active" },
          { label: "Revision", value: "needs_review" },
          { label: "Superadas", value: "superseded" },
        ]}
        value={status}
      />

      <SectionHeader
        action={<Badge>{visibleDecisions.length} registros</Badge>}
        title="Criterio reutilizable"
      />

      <section className="decision-list">
        {visibleDecisions.map((decision) => (
          <DecisionRow decision={decision} key={decision.id} />
        ))}
      </section>
    </div>
  );
}
