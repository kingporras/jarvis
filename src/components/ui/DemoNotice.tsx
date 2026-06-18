import type { ReactNode } from "react";

interface DemoNoticeProps {
  children: ReactNode;
}

export function DemoNotice({ children }: DemoNoticeProps) {
  return (
    <aside className="demo-notice">
      <strong>Modo demo</strong>
      <p>{children}</p>
    </aside>
  );
}
