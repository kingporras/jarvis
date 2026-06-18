import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { DemoNotice } from "../components/ui/DemoNotice";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { reminders } from "../data/mockJarvisData";

export function RemindersPage() {
  return (
    <div className="page-stack">
      <PageHeader
        description="Compromisos de ejemplo sin calendario, notificaciones ni jobs programados."
        eyebrow="Senales simples"
        title="Recordatorios"
      />

      <SectionHeader
        action={<Badge tone="warning">Sin automatizaciones</Badge>}
        description="Recordatorios mock para mostrar prioridad, contexto y estado."
        title="Proximas senales"
      />

      <section className="reminder-list">
        {reminders.map((reminder) => (
          <Card className="reminder-card" key={reminder.id}>
            <div>
              <span>{reminder.timeLabel}</span>
              <h2>{reminder.title}</h2>
              <p>{reminder.context}</p>
            </div>
            <div className="badge-row">
              <PriorityBadge priority={reminder.priority} />
              <StatusBadge status={reminder.status} />
            </div>
          </Card>
        ))}
      </section>

      <DemoNotice>
        Nada se programa, envia o sincroniza. Este modulo solo representa la experiencia futura.
      </DemoNotice>
    </div>
  );
}
