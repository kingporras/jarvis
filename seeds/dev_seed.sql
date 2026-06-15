INSERT OR IGNORE INTO users (
  id, name, email, created_at, updated_at
) VALUES (
  'user_victor_local',
  'Victor',
  NULL,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);

INSERT OR IGNORE INTO projects (
  id, name, objective, status, phase, priority, created_at, updated_at
) VALUES (
  'project_jarvis_seed',
  'Construir JARVIS',
  'Crear la base privada para organizar proyectos, memoria, tareas y decisiones.',
  'active',
  'Sprint 2',
  'P1',
  '2026-01-01T00:05:00.000Z',
  '2026-01-01T00:05:00.000Z'
);

INSERT OR IGNORE INTO tasks (
  id, project_id, title, description, status, priority, due_date, created_at, updated_at
) VALUES (
  'task_jarvis_schema_seed',
  'project_jarvis_seed',
  'Validar migracion D1 inicial',
  'Comprobar que las tablas base se crean correctamente en local.',
  'todo',
  'P1',
  NULL,
  '2026-01-01T00:10:00.000Z',
  '2026-01-01T00:10:00.000Z'
);

INSERT OR IGNORE INTO tasks (
  id, project_id, title, description, status, priority, due_date, created_at, updated_at
) VALUES (
  'task_jarvis_api_seed',
  'project_jarvis_seed',
  'Probar endpoints base de JARVIS',
  'Probar health, dashboard, projects, tasks, memory y decisions.',
  'todo',
  'P2',
  NULL,
  '2026-01-01T00:15:00.000Z',
  '2026-01-01T00:15:00.000Z'
);

INSERT OR IGNORE INTO memory_items (
  id, type, title, content, summary, source, priority, status, confidence, expires_at, last_used_at, created_at, updated_at
) VALUES (
  'memory_jarvis_seed',
  'project',
  'JARVIS es un sistema operativo personal',
  'JARVIS debe priorizar proyectos, memoria, tareas y decisiones por encima de una experiencia centrada solo en chat.',
  'JARVIS no es un chatbot generico; es un centro de mando personal.',
  'dev_seed',
  'P1',
  'active',
  1,
  NULL,
  NULL,
  '2026-01-01T00:20:00.000Z',
  '2026-01-01T00:20:00.000Z'
);

INSERT OR IGNORE INTO decisions (
  id, project_id, title, reason, impact, decided_at, created_at, updated_at
) VALUES (
  'decision_pages_functions_seed',
  'project_jarvis_seed',
  'Usar Pages Functions para Sprint 2',
  'Mantiene frontend y API bajo el mismo dominio y evita CORS innecesario.',
  'Reduce complejidad antes de introducir Workers separados.',
  '2026-01-01T00:25:00.000Z',
  '2026-01-01T00:25:00.000Z',
  '2026-01-01T00:25:00.000Z'
);

INSERT OR IGNORE INTO reminders (
  id, title, notes, remind_at, status, created_at, updated_at
) VALUES (
  'reminder_validate_cloudflare_seed',
  'Validar D1 en Cloudflare Pages',
  'Crear jarvis-db, copiar database_id y enlazar binding DB en Pages.',
  '2026-01-02T09:00:00.000Z',
  'pending',
  '2026-01-01T00:30:00.000Z',
  '2026-01-01T00:30:00.000Z'
);

INSERT OR IGNORE INTO settings (
  key, value, updated_at
) VALUES (
  'app.mode',
  'development',
  '2026-01-01T00:35:00.000Z'
);
