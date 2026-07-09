# Sprint 10.2 - Chat Quality, Safety & Safe Observability

El Chat JARVIS usa la API oficial de OpenAI desde `POST /api/chat/context`, una ruta privada protegida por Cloudflare Access y filtrada por el propietario autenticado en backend.

El chat sigue siendo estrictamente read-only:

- no guarda conversaciones;
- no crea historial de mensajes;
- no modifica datos;
- no escribe en D1;
- no crea tablas ni migraciones;
- no usa tool calling, acciones, streaming, archivos ni adjuntos.

La llamada a OpenAI usa `OPENAI_API_KEY`, `OPENAI_MODEL` y `OPENAI_MAX_OUTPUT_TOKENS` solo en backend. El frontend envia exclusivamente `{ message }` y no puede controlar modelo, tokens, instrucciones ni contexto.

Controles de seguridad:

- `message` debe ser string, no vacio y de 2.000 caracteres o menos;
- campos extra en el payload se rechazan;
- `OPENAI_MAX_OUTPUT_TOKENS` se normaliza entre 200 y 1.200, con 700 por defecto;
- la llamada a OpenAI tiene timeout de 20 segundos;
- errores de OpenAI se devuelven como `AI_REQUEST_FAILED` o `AI_EMPTY_RESPONSE` sin detalles internos.

Observabilidad segura en respuestas correctas:

- `requestId`;
- `latencyMs`;
- `model`;
- `contextStats`;
- `usedContext`.

Datos prohibidos en logs y respuestas:

- prompt completo;
- contexto bruto completo;
- `owner_subject`;
- JWT;
- email;
- claims;
- API keys;
- secretos;
- mensaje completo del usuario;
- contexto completo.

Se permite loguear solo errores genericos con `requestId` y, si aplica, status HTTP de OpenAI. No hay logs persistentes, analytics externas ni tablas de auditoria.

No hay JANUS, Obsidian, Lenovo, Raspberry, voz, RAG, Vectorize, Workers AI ni AI Gateway conectados en este sprint.

Sprint 11 queda reservado para propuestas de accion con aprobacion humana explicita antes de cualquier mutacion real.
