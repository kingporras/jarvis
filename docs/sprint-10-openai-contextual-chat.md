# Sprint 10.1 - OpenAI Contextual Chat Read-Only

`POST /api/chat/context` conecta el Chat de JARVIS con la API oficial de OpenAI mediante Responses API. La ruta es privada: primero pasa por `requireAccess()` y despues filtra todo el contexto por `owner_subject` autenticado.

Contrato de entrada:

- `message`: texto requerido, no vacio.

Contrato de salida:

- `answer`
- `generatedAt`
- `mode`
- `suggestedFollowUps`
- `usedContext`

El backend lee contexto real y acotado de D1: briefing ejecutivo, proyectos, tareas, memoria activa, decisiones, personas, recordatorios y enlaces de memoria. No lee ni devuelve `owner_subject`, email, JWT, secretos ni claves. Si falta `OPENAI_API_KEY` u `OPENAI_MODEL`, responde `503 AI_NOT_CONFIGURED`.

La llamada a OpenAI se hace solo desde backend con `fetch` a Responses API, `store: false`, `max_output_tokens` desde `OPENAI_MAX_OUTPUT_TOKENS` y sin herramientas, streaming, archivos, web, acciones ni function calling.

El endpoint es de solo lectura. No crea conversaciones, no guarda mensajes, no escribe historial, no modifica D1 y no toca migraciones ni schema. La pagina `/chat` mantiene el historial solo en estado React mientras esta abierta y envia exclusivamente `{ message }`.

Validacion de produccion queda pendiente de configurar secretos reales en Cloudflare Pages:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_MAX_OUTPUT_TOKENS` opcional

Sprint 10.2 puede mejorar calidad de respuesta y observabilidad sin cambiar la semantica read-only ni introducir persistencia de mensajes.
