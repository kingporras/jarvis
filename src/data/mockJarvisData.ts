import type {
  ChatMessage,
  DailyMetric,
  JarvisDecision,
  JarvisMemory,
  JarvisPerson,
  JarvisProject,
  JarvisReminder,
  JarvisTask,
  QuickAction,
  SystemStatus,
} from "../types/jarvis";

/**
 * Datos temporales de demostracion para Sprint 4.
 * No representan informacion real ni deben conectarse a APIs.
 */

export const dailyFocus = {
  greeting: "Buenos dias, Victor",
  mode: "Sistema en modo demo",
  headline: "Cerrar la arquitectura visual del Command Center",
  context:
    "El diseno base desbloquea los siguientes sprints de proyectos, memoria y chat.",
  linkedProject: "JARVIS Foundation",
  note: "Modo demo: esta accion no guarda cambios.",
};

export const dailyMetrics: DailyMetric[] = [
  { label: "Tareas prioritarias", value: "3", detail: "P0/P1", tone: "warning" },
  { label: "Proyectos activos", value: "2", detail: "en foco", tone: "info" },
  { label: "Recordatorios", value: "2", detail: "proximos", tone: "success" },
  { label: "Decision pendiente", value: "1", detail: "revision", tone: "neutral" },
];

export const systemStatus: SystemStatus = {
  state: "focus",
  general: "Estable",
  focus: "Command Center UX",
  priority: "P0",
  activity: "3 frentes activos",
  security: "Modo demo",
  memory: "Preparada, aun no conectada",
  note: "Indicadores visuales de demostracion. No representan actividad en tiempo real.",
};

export const jarvisRecommendation = {
  title: "JARVIS recomienda",
  text:
    "Antes de abrir nuevas funcionalidades, termina el Command Center y valida que el dashboard reduzca carga mental en menos de 10 segundos de lectura.",
  notice:
    "Recomendacion estatica de demostracion. La IA real llegara despues de reactivar auth y no ejecutara acciones sin confirmacion.",
};

export const quickActions: QuickAction[] = [
  {
    label: "Nueva tarea",
    description: "Abre el modulo de ejecucion diaria.",
    route: "/tasks",
  },
  {
    label: "Guardar idea",
    description: "Vista local de memoria, sin guardar datos.",
    route: "/memory",
  },
  {
    label: "Abrir chat",
    description: "Canal futuro de trabajo con JARVIS.",
    route: "/chat",
  },
  {
    label: "Ver proyectos",
    description: "Revisar frentes activos y riesgos.",
    route: "/projects",
  },
  {
    label: "Crear recordatorio",
    description: "Muestra el modulo de avisos mock.",
    route: "/reminders",
  },
  {
    label: "Revisar decisiones",
    description: "Consulta criterios y consecuencias.",
    route: "/decisions",
  },
];

export const projects: JarvisProject[] = [
  {
    id: "jarvis-foundation",
    name: "JARVIS Foundation",
    objective:
      "Construir una base privada, modular y util para gestionar vida, proyectos y conocimiento.",
    status: "active",
    phase: "Command Center UX",
    priority: "P0",
    progress: 60,
    nextAction: "Validar diseno responsive.",
    risk: "Evitar mezclar UX mock con integracion real.",
    taskCount: 3,
    decisionCount: 2,
    linkedMemory: "Primero el reactor arc. Luego la armadura.",
    updatedAt: "Actualizado hoy",
  },
  {
    id: "personal-execution",
    name: "Sistema de ejecucion personal",
    objective:
      "Convertir prioridades, rituales y tareas en un flujo semanal simple y revisable.",
    status: "planning",
    phase: "Diseno de flujo",
    priority: "P1",
    progress: 25,
    nextAction: "Definir ritual semanal.",
    risk: "Evitar anadir automatizaciones demasiado pronto.",
    taskCount: 2,
    decisionCount: 1,
    linkedMemory: "La ejecucion necesita contexto, no ruido.",
    updatedAt: "Actualizado ayer",
  },
  {
    id: "knowledge-library",
    name: "Biblioteca de conocimiento",
    objective:
      "Organizar aprendizajes y decisiones reutilizables antes de construir recuperacion avanzada.",
    status: "paused",
    phase: "Descubrimiento",
    priority: "P2",
    progress: 10,
    nextAction: "Definir taxonomia minima.",
    risk: "No construir RAG antes de memoria editable.",
    taskCount: 1,
    decisionCount: 1,
    linkedMemory: "La memoria editable precede al RAG.",
    updatedAt: "En espera",
  },
];

export const tasks: JarvisTask[] = [
  {
    id: "task-responsive",
    title: "Validar responsive del Command Center",
    projectId: "jarvis-foundation",
    projectName: "JARVIS Foundation",
    priority: "P0",
    status: "in_progress",
    lane: "today",
    dueLabel: "Hoy",
    context: "Comprobar escritorio, iPhone 390x844 e iPhone SE 320x568.",
  },
  {
    id: "task-components",
    title: "Consolidar componentes reutilizables",
    projectId: "jarvis-foundation",
    projectName: "JARVIS Foundation",
    priority: "P0",
    status: "todo",
    lane: "today",
    dueLabel: "Hoy",
    context: "Evitar componentes de una sola pantalla y mantener datos centralizados.",
  },
  {
    id: "task-dashboard",
    title: "Revisar jerarquia del dashboard",
    projectId: "jarvis-foundation",
    projectName: "JARVIS Foundation",
    priority: "P1",
    status: "todo",
    lane: "today",
    dueLabel: "Hoy",
    context: "El foco P0 debe ser leible en menos de 10 segundos.",
  },
  {
    id: "task-memory-flow",
    title: "Disenar vista de memoria editable",
    projectId: "knowledge-library",
    projectName: "Biblioteca de conocimiento",
    priority: "P1",
    status: "in_progress",
    lane: "in_progress",
    dueLabel: "Esta semana",
    context: "La memoria debe mostrar tipo, estado, prioridad y relacion.",
  },
  {
    id: "task-people-reminders",
    title: "Preparar datos mock para personas y recordatorios",
    projectId: "personal-execution",
    projectName: "Sistema de ejecucion personal",
    priority: "P2",
    status: "done",
    lane: "done",
    dueLabel: "Mock cerrado",
    context: "Sin contactos reales, calendario ni integraciones.",
  },
  {
    id: "task-auth-before-data",
    title: "Planificar reactivacion de auth antes de datos reales",
    projectId: "jarvis-foundation",
    projectName: "JARVIS Foundation",
    priority: "P1",
    status: "todo",
    lane: "upcoming",
    dueLabel: "Sprint 5",
    context: "No conectar Proyectos/Tareas a API real mientras AUTH_ENABLED siga en false.",
  },
];

export const memories: JarvisMemory[] = [
  {
    id: "memory-reactor",
    type: "decision",
    title: "La memoria editable es el reactor arc de JARVIS.",
    summary:
      "Primero se construye una memoria revisable y controlada antes de automatizaciones.",
    priority: "P0",
    status: "active",
    projectName: "JARVIS Foundation",
    updatedAt: "Actualizado hoy",
  },
  {
    id: "memory-cost",
    type: "preference",
    title: "Priorizar coste bajo y arquitectura simple.",
    summary:
      "Evitar infraestructura innecesaria hasta que haya flujos reales validados.",
    priority: "P1",
    status: "active",
    projectName: "JARVIS Foundation",
    updatedAt: "Actualizado hoy",
  },
  {
    id: "memory-sprint4",
    type: "project",
    title: "Sprint 4 se limita a UX y datos mock.",
    summary:
      "No conectar frontend a D1, APIs reales ni datos persistentes durante esta fase.",
    priority: "P1",
    status: "needs_review",
    projectName: "JARVIS Foundation",
    updatedAt: "Hace 1 dia",
  },
  {
    id: "memory-confirmation",
    type: "knowledge",
    title: "La IA debe proponer acciones, no ejecutarlas sin confirmacion.",
    summary:
      "Cualquier accion sensible futura debe pedir confirmacion explicita antes de ejecutarse.",
    priority: "P2",
    status: "active",
    updatedAt: "Hace 2 dias",
  },
  {
    id: "memory-mobile",
    type: "temporal",
    title: "Revisar responsive de iPhone antes de conectar datos reales.",
    summary:
      "La navegacion movil debe priorizar Inicio, Chat, Tareas y Mas.",
    priority: "P4",
    status: "temporal",
    projectName: "JARVIS Foundation",
    updatedAt: "Esta semana",
  },
  {
    id: "memory-personal",
    type: "personal",
    title: "El dashboard no debe parecer un chatbot generico.",
    summary:
      "La primera experiencia debe ordenar prioridades, proyectos, memoria y decisiones.",
    priority: "P1",
    status: "active",
    updatedAt: "Actualizado hoy",
  },
];

export const decisions: JarvisDecision[] = [
  {
    id: "decision-memory-before-rag",
    title: "La memoria editable precede al RAG.",
    status: "active",
    impact: "Reduce complejidad y protege el control manual del contexto.",
    reason: "JARVIS necesita una base revisable antes de recuperacion avanzada.",
    projectName: "Biblioteca de conocimiento",
    priority: "P0",
    dateLabel: "Sprint 4",
    nextReview: "Revisar al iniciar memoria real.",
  },
  {
    id: "decision-no-api-sprint4",
    title: "No conectar frontend a D1 durante Sprint 4.",
    status: "active",
    impact: "Mantiene el sprint como UX local y evita escrituras publicas.",
    reason: "AUTH_ENABLED esta false; los datos reales deben esperar.",
    projectName: "JARVIS Foundation",
    priority: "P0",
    dateLabel: "Sprint 4",
    nextReview: "Sprint 5, tras reactivar auth.",
  },
  {
    id: "decision-ai-confirmation",
    title: "La IA debe pedir confirmacion antes de ejecutar acciones.",
    status: "needs_review",
    impact: "Evita automatizaciones opacas y mantiene control del usuario.",
    reason: "JARVIS debe asistir primero y actuar solo con permiso.",
    projectName: "Sistema de ejecucion personal",
    priority: "P1",
    dateLabel: "Pendiente de revision",
    nextReview: "Antes de agentes o automatizaciones.",
  },
  {
    id: "decision-mobile-nav",
    title: "La navegacion movil prioriza Inicio, Chat, Tareas y Mas.",
    status: "active",
    impact: "Reduce densidad en iPhone y conserva todas las rutas.",
    reason: "Las rutas secundarias caben mejor dentro de un panel local.",
    projectName: "JARVIS Foundation",
    priority: "P2",
    dateLabel: "Sprint 4",
    nextReview: "Despues de QA movil.",
  },
];

export const persons: JarvisPerson[] = [
  {
    id: "person-product-owner",
    name: "Persona A",
    role: "Propietario de producto",
    relation: "Vision y prioridades",
    context:
      "Referencia ficticia para validar como JARVIS podria recordar contexto manual.",
    lastInteraction: "Contacto mock: esta semana",
  },
  {
    id: "person-engineer",
    name: "Persona B",
    role: "Colaborador tecnico",
    relation: "Arquitectura y revision",
    context:
      "Ejemplo generico para relacionar decisiones con proyectos sin usar contactos reales.",
    lastInteraction: "Contacto mock: pendiente",
  },
  {
    id: "person-advisor",
    name: "Persona C",
    role: "Consejo estrategico",
    relation: "Criterio externo",
    context:
      "Muestra como se veria una ficha humana sin conectar calendario ni agenda.",
    lastInteraction: "Contacto mock: mes actual",
  },
];

export const reminders: JarvisReminder[] = [
  {
    id: "reminder-responsive",
    title: "Revisar responsive antes de cerrar Sprint 4",
    timeLabel: "Hoy",
    context: "Validar 1280px, 390x844 y 320x568 sin scroll horizontal.",
    status: "upcoming",
    priority: "P0",
  },
  {
    id: "reminder-auth",
    title: "Reactivar auth antes de conectar datos reales",
    timeLabel: "Sprint 5",
    context:
      "Cambiar AUTH_ENABLED a true y validar login/sesiones en produccion.",
    status: "upcoming",
    priority: "P0",
  },
  {
    id: "reminder-weekly",
    title: "Revisar decisiones abiertas",
    timeLabel: "Viernes mock",
    context: "Cerrar o actualizar decisiones que cambien la arquitectura.",
    status: "upcoming",
    priority: "P2",
  },
];

export const chatMessages: ChatMessage[] = [
  {
    id: "chat-1",
    author: "Victor",
    text: "Donde dejamos JARVIS?",
  },
  {
    id: "chat-2",
    author: "JARVIS",
    text:
      "El sistema base esta operativo. La prioridad actual es convertir las pantallas placeholder en un Command Center usable antes de conectar datos reales.",
  },
  {
    id: "chat-3",
    author: "Victor",
    text: "Que deberia cerrar primero?",
  },
  {
    id: "chat-4",
    author: "JARVIS",
    text:
      "Validar el dashboard, la navegacion movil y la jerarquia entre tareas, proyectos y memoria. Despues hay que reactivar auth antes de conectar datos reales.",
  },
];

export const suggestedPrompts = [
  "Organiza mi semana",
  "Resume mis prioridades",
  "Donde dejamos JARVIS?",
  "Crea un plan para hoy",
];

export const nextSprintRecommendation = {
  title: "Sprint 5 - Reactivar auth privada y conectar Proyectos/Tareas a API real",
  steps: [
    "Cambiar AUTH_ENABLED a true.",
    "Configurar JARVIS_AUTH_PASSWORD_HASH en Cloudflare.",
    "Validar login, sesiones y proteccion de APIs en produccion.",
    "Solo despues conectar Proyectos y Tareas a datos reales.",
  ],
};
