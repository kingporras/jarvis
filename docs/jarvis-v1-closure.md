# JARVIS v1 - Closure

## Incluido en v1

JARVIS v1 incluye datos privados reales en Cloudflare D1 para proyectos, tareas, memoria, decisiones, personas y recordatorios. Tambien incluye Dashboard briefing, Chat contextual con OpenAI desde backend, propuestas de accion, ejecucion aprobada por humano, historial de acciones y exportacion JSON privada.

## No incluido en v1

JARVIS v1 no incluye importacion Obsidian, sincronizacion JANUS/Raspberry, sincronizacion Lenovo local, voz, email, calendario, notificaciones, RAG, Vectorize, embeddings, Workers AI, AI Gateway, streaming, adjuntos ni automatizaciones avanzadas.

## Arquitectura actual

- Frontend React servido por Cloudflare Pages.
- Functions privadas en `functions/api/[[path]].ts`.
- Cloudflare Access como puerta de acceso humano.
- Cloudflare D1 como base de datos privada.
- OpenAI API llamada solo desde backend.
- Auditoria de acciones en `action_executions`.

## Flujo de datos

El frontend llama a `/api/*`. El router valida Access, obtiene `identity.subject` y pasa ese owner al modulo correspondiente. Las consultas D1 filtran por `owner_subject` desde backend. El frontend nunca envia ni recibe `owner_subject`, JWT, claims, API keys ni secretos.

## Flujo Chat a auditoria

1. `/api/chat/context` lee contexto D1 privado y llama a OpenAI desde backend.
2. La respuesta puede incluir propuestas de accion en vista previa.
3. El usuario confirma una propuesta en Chat.
4. `/api/actions/execute` valida aprobacion, tipo y payload permitido.
5. El backend ejecuta la mutacion D1 permitida.
6. El resultado o fallo controlado se registra en `action_executions`.
7. `/api/actions/history` y `/api/export/json` exponen solo auditoria segura.

## Endpoints principales

- `GET /api/health`
- `GET /api/dashboard/briefing`
- `POST /api/chat/context`
- `POST /api/actions/execute`
- `GET /api/actions/history`
- `GET /api/export/json`
- CRUD privado de proyectos, tareas, memoria, decisiones, personas y recordatorios.

## Seguridad

- Cloudflare Access protege rutas privadas.
- D1 se filtra por `owner_subject`.
- OpenAI API solo vive en backend.
- Las acciones requieren aprobacion humana explicita.
- No se usa sesion ChatGPT Plus.
- No se usan cookies personales para OpenAI.
- Export e historial no devuelven `owner_subject`, JWT, email, claims, payload completo, result completo ni secretos.

## Variables OpenAI necesarias

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_MAX_OUTPUT_TOKENS` opcional

No documentar valores reales en el repositorio.

## Limites actuales

- No hay historial persistente de conversaciones.
- Las propuestas dependen del contrato JSON del modelo y se validan antes de mostrarse o ejecutar.
- Las acciones ejecutables estan limitadas a `create_task`, `save_memory`, `create_decision`, `create_reminder` y `update_task_status`.
- La auditoria exportada es intencionalmente minima y no incluye payload/result completo.
- Las pruebas de produccion requieren sesion Cloudflare Access real.

## Siguientes sprints v1.5 sugeridos

- Importacion Obsidian controlada.
- Busqueda y filtros de auditoria.
- Hardening de pruebas end-to-end en produccion.
- Mejoras de recuperacion ante errores OpenAI.
- Backups/export programado con aprobacion explicita.
- Preparacion de RAG/Vectorize como diseno, sin activar ingestion automatica.
