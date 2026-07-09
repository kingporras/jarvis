# JARVIS v1 - Closure

## Que incluye JARVIS v1

- PWA privada.
- Cloudflare Access.
- Cloudflare D1.
- Proyectos.
- Tareas.
- Memoria.
- Decisiones.
- Personas.
- Recordatorios.
- Dashboard real.
- Ajustes reales.
- Export JSON.
- Chat contextual con OpenAI.
- Propuestas de accion.
- Aprobacion humana.
- Ejecucion controlada.
- Auditoria.
- Historial de acciones.

## Que no incluye v1

- Obsidian conectado.
- JANUS/Raspberry conectado.
- Lenovo local conectado.
- Voz.
- Gmail.
- Calendar.
- RAG/Vectorize.
- Workers AI.
- AI Gateway.
- Automatizaciones avanzadas.
- Historial persistente de conversaciones.
- Agentes autonomos.

## Arquitectura actual

- Frontend React/Vite servido como PWA privada.
- Cloudflare Pages para hosting.
- Pages Functions en `functions/api/[[path]].ts`.
- Cloudflare Access para acceso humano y validacion inicial.
- Cloudflare D1 como base de datos privada.
- OpenAI API desde backend, nunca desde el navegador.
- `owner_subject` por `identity.subject`, derivado exclusivamente en backend.

## Flujo de datos

El frontend llama a rutas `/api/*`. El router valida Access con `requireAccess()`, obtiene `identity.subject` y entrega ese owner a los modulos de datos. Las consultas D1 filtran por `owner_subject`; el frontend no envia ni recibe ese valor.

## Flujo principal

```text
Chat
-> contexto real
-> respuesta IA
-> propuesta de accion
-> aprobacion humana
-> validacion backend
-> escritura D1
-> auditoria
-> historial
```

## Endpoints principales

- `GET /api/health`
- `GET /api/dashboard/briefing`
- `GET /api/export/json`
- `POST /api/chat/context`
- `POST /api/actions/execute`
- `GET /api/actions/history`

Modulos existentes:

- `/api/projects`
- `/api/tasks`
- `/api/memory`
- `/api/decisions`
- `/api/persons`
- `/api/reminders`

## Seguridad

- Cloudflare Access protege la app.
- `requireAccess()` valida rutas privadas en backend.
- `owner_subject` nunca llega desde frontend.
- OpenAI API key solo vive en backend.
- Las acciones requieren aprobacion humana explicita.
- La auditoria no expone secretos.
- Export JSON es privado, filtrado por owner y usa `Cache-Control: no-store`.
- Export e historial no devuelven JWT, email, claims, API keys, payload completo ni result completo.
- JARVIS v1 no usa ChatGPT Plus como API ni cookies personales.
- JANUS/Lenovo permanecen aislados sin credenciales Cloud.

## Variables OpenAI necesarias

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_MAX_OUTPUT_TOKENS` opcional

No incluir secretos ni valores reales en el repositorio.

## Limites actuales

- No hay historial persistente de conversaciones.
- No hay agentes autonomos.
- Las acciones ejecutables estan limitadas a `create_task`, `save_memory`, `create_decision`, `create_reminder` y `update_task_status`.
- La auditoria exportada es minima y no incluye `payload_json` ni `result_json` completos.
- Las pruebas completas de produccion requieren sesion Cloudflare Access real.

## Proximos sprints v1.5 sugeridos

- Obsidian import manual.
- JANUS bridge controlado.
- Voz push-to-talk.
- Gmail/Calendar bajo aprobacion.
- RAG/Vectorize si hay volumen real.
- AI Gateway para coste/observabilidad.
- Backups/export programado.
