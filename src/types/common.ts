import type { ComponentType } from "react";

export type PageKey =
  | "dashboard"
  | "chat"
  | "memory"
  | "projects"
  | "tasks"
  | "decisions"
  | "persons"
  | "reminders"
  | "settings";

export type NavIcon =
  | "dashboard"
  | "chat"
  | "memory"
  | "projects"
  | "tasks"
  | "decisions"
  | "persons"
  | "reminders"
  | "settings";

export interface NavItem {
  key: PageKey;
  label: string;
  shortLabel: string;
  description: string;
  icon: NavIcon;
}

export interface RouteDefinition {
  key: PageKey;
  path: string;
  title: string;
  eyebrow: string;
  description: string;
  component: ComponentType;
}
