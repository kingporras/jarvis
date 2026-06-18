import { useState } from "react";
import type { QuickAction } from "../../types/jarvis";
import { Button } from "../ui/Button";
import { DemoNotice } from "../ui/DemoNotice";

interface QuickActionGridProps {
  actions: QuickAction[];
}

function navigateTo(route: string) {
  window.history.pushState({}, "", route);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function QuickActionGrid({ actions }: QuickActionGridProps) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="quick-actions">
      <div className="quick-actions__grid">
        {actions.map((action) => (
          <Button
            className="quick-action"
            key={action.label}
            onClick={() => {
              if (action.route) {
                navigateTo(action.route);
                return;
              }

              setNotice(action.demoMessage ?? "Accion local de demostracion.");
            }}
            variant="ghost"
          >
            <span>{action.label}</span>
            <small>{action.description}</small>
          </Button>
        ))}
      </div>
      {notice ? <DemoNotice>{notice}</DemoNotice> : null}
    </div>
  );
}
