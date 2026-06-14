import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  tone?: "default" | "quiet" | "accent";
}

export function Card({ children, className, tone = "default", ...props }: CardProps) {
  return (
    <section className={cn("card", `card--${tone}`, className)} {...props}>
      {children}
    </section>
  );
}
