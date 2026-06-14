import { Badge } from "./Badge";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "info" | "success" | "warning";
}

export function StatCard({ label, value, detail, tone = "neutral" }: StatCardProps) {
  return (
    <Card className="stat-card">
      <div className="stat-card__topline">
        <span>{label}</span>
        <Badge tone={tone}>{detail}</Badge>
      </div>
      <strong>{value}</strong>
    </Card>
  );
}
