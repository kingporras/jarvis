import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning";
}

export function Badge({ children, className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span className={cn("badge", `badge--${tone}`, className)} {...props}>
      {children}
    </span>
  );
}
