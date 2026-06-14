import type { NavItem } from "../types/common";

export const navigationItems: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    shortLabel: "Inicio",
    description: "Centro de mando",
    icon: "dashboard"
  },
  {
    key: "chat",
    label: "Chat JARVIS",
    shortLabel: "Chat",
    description: "Interfaz conversacional",
    icon: "chat"
  },
  {
    key: "memory",
    label: "Memoria",
    shortLabel: "Memoria",
    description: "Núcleo editable",
    icon: "memory"
  },
  {
    key: "projects",
    label: "Proyectos",
    shortLabel: "Proyectos",
    description: "Frentes activos",
    icon: "projects"
  },
  {
    key: "tasks",
    label: "Tareas",
    shortLabel: "Tareas",
    description: "Ejecución diaria",
    icon: "tasks"
  },
  {
    key: "decisions",
    label: "Decisiones",
    shortLabel: "Decidir",
    description: "Registro de criterio",
    icon: "decisions"
  },
  {
    key: "persons",
    label: "Personas",
    shortLabel: "Personas",
    description: "Relaciones clave",
    icon: "persons"
  },
  {
    key: "reminders",
    label: "Recordatorios",
    shortLabel: "Avisos",
    description: "Señales simples",
    icon: "reminders"
  },
  {
    key: "settings",
    label: "Ajustes",
    shortLabel: "Ajustes",
    description: "Sistema y exportación",
    icon: "settings"
  }
];
