import type { RouteDefinition } from "../types/common";
import { ChatPage } from "../pages/ChatPage";
import { DashboardPage } from "../pages/DashboardPage";
import { DecisionsPage } from "../pages/DecisionsPage";
import { MemoryPage } from "../pages/MemoryPage";
import { PersonsPage } from "../pages/PersonsPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { RemindersPage } from "../pages/RemindersPage";
import { SettingsPage } from "../pages/SettingsPage";
import { TasksPage } from "../pages/TasksPage";

export const routes: RouteDefinition[] = [
  {
    key: "dashboard",
    path: "/",
    title: "Centro de mando",
    eyebrow: "Dashboard",
    description:
      "Vista inicial para orientar prioridades, proyectos, memoria y decisiones con datos mock locales.",
    component: DashboardPage,
  },
  {
    key: "chat",
    path: "/chat",
    title: "Chat JARVIS",
    eyebrow: "Modulo conversacional",
    description:
      "Canal de trabajo futuro con JARVIS. En este sprint no hay IA conectada ni llamadas externas.",
    component: ChatPage,
  },
  {
    key: "memory",
    path: "/memory",
    title: "Memoria",
    eyebrow: "Reactor arc",
    description:
      "Nucleo editable futuro para conocimiento, contexto, reglas y enlaces entre ideas.",
    component: MemoryPage,
  },
  {
    key: "projects",
    path: "/projects",
    title: "Proyectos",
    eyebrow: "Frentes activos",
    description:
      "Proyectos reales persistidos en D1 y protegidos por Cloudflare Access.",
    component: ProjectsPage,
  },
  {
    key: "tasks",
    path: "/tasks",
    title: "Tareas",
    eyebrow: "Ejecucion",
    description:
      "Bandeja real para prioridades, estados y proximas acciones persistidas.",
    component: TasksPage,
  },
  {
    key: "decisions",
    path: "/decisions",
    title: "Decisiones",
    eyebrow: "Criterio",
    description:
      "Registro futuro de decisiones, motivos, opciones descartadas y consecuencias observadas.",
    component: DecisionsPage,
  },
  {
    key: "persons",
    path: "/persons",
    title: "Personas",
    eyebrow: "Relaciones",
    description:
      "Directorio manual para personas relevantes y contexto relacional, sin integraciones externas.",
    component: PersonsPage,
  },
  {
    key: "reminders",
    path: "/reminders",
    title: "Recordatorios",
    eyebrow: "Senales",
    description:
      "Recordatorios simples de demostracion. Nada se programa ni se envia todavia.",
    component: RemindersPage,
  },
  {
    key: "settings",
    path: "/settings",
    title: "Ajustes",
    eyebrow: "Sistema",
    description:
      "Configuracion futura de modelo IA, exportacion JSON y preferencias privadas de JARVIS.",
    component: SettingsPage,
  },
];

export function getRouteByKey(key: RouteDefinition["key"]) {
  return routes.find((route) => route.key === key) ?? routes[0];
}

export function getRouteByPath(pathname: string) {
  return routes.find((route) => route.path === pathname) ?? routes[0];
}
