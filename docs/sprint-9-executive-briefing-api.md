# Sprint 9.1 - Executive Briefing API

`GET /api/dashboard/briefing` devuelve un briefing privado y de solo lectura para el futuro Dashboard real.

El briefing incluye:

- `generatedAt`
- `nextBestAction`
- `keyTasks`
- `activeProjects`
- `reminders.overdue`
- `reminders.upcoming`
- `memoryAttention`
- `decisions.open`
- `decisions.recentDecided`

La siguiente mejor accion se elige de forma determinista: tareas accionables del usuario, vencidas primero, despues en curso, despues prioridad P0-P4, despues fecha limite mas cercana y finalmente `updated_at` mas antiguo. El endpoint no usa IA, no genera recomendaciones libres y no llama a ningun modelo.

El endpoint no crea, modifica, archiva, completa, reprograma ni borra datos. Todas las consultas filtran por `owner_subject` derivado de `requireAccess()` y nunca por email ni por parametros de entrada.

Sprint 9.2 conectara el Dashboard visual a este contrato sin cambiar la semantica de lectura ni el aislamiento por usuario.
