import type { ArcCoreState } from "../../types/jarvis";

export type { ArcCoreState };

interface ArcCoreProps {
  state: ArcCoreState;
}

const stateLabel: Record<ArcCoreState, string> = {
  idle: "Baja energia",
  focus: "Foco activo",
  active: "Actividad estable",
  blocked: "Bloqueo contenido",
  calm: "Calma operativa",
};

export function ArcCore({ state }: ArcCoreProps) {
  return (
    <div className={`arc-core arc-core--${state}`} data-state={state}>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 220 220">
        <defs>
          <radialGradient id={`arc-core-glow-${state}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.36" />
            <stop offset="48%" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle className="arc-core__aura" cx="110" cy="110" r="92" fill={`url(#arc-core-glow-${state})`} />

        <g className="arc-core__ring arc-core__ring--outer">
          <circle cx="110" cy="110" r="86" pathLength="100" />
          <path d="M110 24a86 86 0 0 1 74 42" pathLength="100" />
          <path d="M48 169a86 86 0 0 1-19-70" pathLength="100" />
        </g>

        <g className="arc-core__ring arc-core__ring--middle">
          <circle cx="110" cy="110" r="62" pathLength="100" />
          <path d="M69 64a62 62 0 0 1 83-3" pathLength="100" />
          <path d="M166 137a62 62 0 0 1-89 23" pathLength="100" />
        </g>

        <g className="arc-core__ring arc-core__ring--inner">
          <circle cx="110" cy="110" r="38" pathLength="100" />
          <path d="M110 72a38 38 0 0 1 34 21" pathLength="100" />
        </g>

        <g className="arc-core__radials">
          <line x1="110" x2="110" y1="16" y2="34" />
          <line x1="110" x2="110" y1="186" y2="204" />
          <line x1="16" x2="34" y1="110" y2="110" />
          <line x1="186" x2="204" y1="110" y2="110" />
          <line x1="43.5" x2="56.2" y1="43.5" y2="56.2" />
          <line x1="163.8" x2="176.5" y1="163.8" y2="176.5" />
          <line x1="176.5" x2="163.8" y1="43.5" y2="56.2" />
          <line x1="56.2" x2="43.5" y1="163.8" y2="176.5" />
        </g>

        <g className="arc-core__points">
          <circle cx="110" cy="24" r="3" />
          <circle cx="172" cy="72" r="2.5" />
          <circle cx="154" cy="162" r="2.5" />
          <circle cx="54" cy="151" r="2.5" />
          <circle cx="45" cy="86" r="2" />
        </g>

        <circle className="arc-core__center arc-core__center--outer" cx="110" cy="110" r="24" />
        <circle className="arc-core__center arc-core__center--middle" cx="110" cy="110" r="14" />
        <circle className="arc-core__center arc-core__center--core" cx="110" cy="110" r="7" />
      </svg>
      <span className="arc-core__caption">{stateLabel[state]}</span>
    </div>
  );
}
