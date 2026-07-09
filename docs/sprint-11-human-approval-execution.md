# Sprint 11.2 - Human Approval & Controlled Action Execution

## Flujo

El flujo de acciones es:

`propuesta IA -> vista previa -> aprobacion humana -> validacion backend -> ejecucion D1 -> auditoria`

JARVIS nunca ejecuta una accion automaticamente. El Chat muestra la propuesta, pide confirmacion explicita y despues llama a `POST /api/actions/execute`.

## Endpoint

`POST /api/actions/execute` es privado y pasa por Cloudflare Access antes de validar datos del usuario o escribir en D1.

El backend exige:

- `approval.confirmed === true`
- `proposal.requiresApproval === true`
- `proposal.status === "preview_only"`
- un solo `proposal`
- `proposal.type` permitido
- `proposal.payload` validado y saneado

El backend fuerza siempre `owner_subject` desde la identidad autenticada. Nunca acepta `owner_subject` desde el request.

## Tipos Ejecutables

- `create_task`
- `save_memory`
- `create_decision`
- `create_reminder`
- `update_task_status`

Los tipos desconocidos devuelven `400 INVALID_ACTION_TYPE`.

## Auditoria

La migracion `0009_action_executions.sql` crea `action_executions`.

Cada ejecucion correcta registra:

- tipo de accion
- request id de origen
- proposal id
- entidad objetivo
- summary saneado
- payload validado
- resultado saneado
- warnings
- fecha de creacion

Los fallos controlados posteriores a una validacion de aprobacion tambien se registran como `failed`.

## Datos Prohibidos

No se guarda ni se devuelve:

- JWT
- email
- claims
- API keys
- secretos
- prompt completo
- contexto bruto de OpenAI
- `owner_subject` en respuestas frontend

## Errores Esperados

- `400 INVALID_ACTION_PROPOSAL`
- `400 APPROVAL_REQUIRED`
- `400 INVALID_PAYLOAD`
- `400 INVALID_ACTION_TYPE`
- `404 TARGET_NOT_FOUND`
- `409 TARGET_AMBIGUOUS`
- `500 ACTION_EXECUTION_FAILED`

## Limitaciones

La ejecucion no llama a OpenAI, no usa tool calling, no crea proyectos, no envia emails, no crea eventos de calendario y no guarda historial de chat.

Sprint 11.3 puede anadir historial de acciones, busqueda de ejecuciones y refinamiento UX de aclaraciones.
