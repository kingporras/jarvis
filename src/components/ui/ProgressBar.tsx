interface ProgressBarProps {
  label?: string;
  value: number;
}

export function ProgressBar({ label = "Progreso", value }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="progress" aria-label={`${label}: ${safeValue}%`}>
      <div className="progress__meta">
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className="progress__track">
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
