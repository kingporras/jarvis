import { useState } from "react";
import type { SystemStatus } from "../../types/jarvis";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { PriorityBadge } from "../ui/PriorityBadge";
import { SectionHeader } from "../ui/SectionHeader";
import { ArcCore } from "./ArcCore";

interface SystemStatusCardProps {
  status: SystemStatus;
}

export function SystemStatusCard({ status }: SystemStatusCardProps) {
  const [voiceNotice, setVoiceNotice] = useState("");

  return (
    <Card className="system-status-card">
      <SectionHeader
        action={<Badge tone="success">{status.general}</Badge>}
        eyebrow="Estado del sistema"
        title="Arc Core"
      />

      <div className="system-status-card__core">
        <ArcCore state={status.state} />
      </div>

      <div className="system-status-card__summary" aria-label="Resumen del estado del sistema">
        <div>
          <span>Foco actual</span>
          <strong>{status.focus}</strong>
        </div>
        <div>
          <span>Prioridad</span>
          <PriorityBadge priority={status.priority} />
        </div>
        <div>
          <span>Actividad</span>
          <strong>{status.activity}</strong>
        </div>
        <div>
          <span>Seguridad</span>
          <strong>{status.security}</strong>
        </div>
        <div>
          <span>Memoria</span>
          <strong>{status.memory}</strong>
        </div>
      </div>

      <button
        aria-label="Voz de JARVIS disponible en una futura fase"
        className="voice-future-button"
        onClick={() => setVoiceNotice("Voz disponible en una futura fase de JARVIS.")}
        type="button"
      >
        <span aria-hidden="true" />
        Voz futura
      </button>
      <p className="voice-future-message" aria-live="polite">
        {voiceNotice}
      </p>

      <p className="system-status-card__note">{status.note}</p>
    </Card>
  );
}
