# Sprint 11.1 - Action Proposals Preview

## Objetivo

JARVIS puede devolver propuestas de accion estructuradas desde `POST /api/chat/context`, pero esta fase solo las muestra como vista previa. No ejecuta acciones, no escribe en D1 y no expone endpoints nuevos.

## Contrato

Cada respuesta puede incluir `actionProposals`, con un maximo de 3 elementos normalizados por backend:

- `id`
- `type`: `create_task`, `save_memory`, `create_decision`, `create_reminder` o `update_task_status`
- `title`
- `summary`
- `confidence`: `low`, `medium` o `high`
- `requiresApproval`: siempre `true`
- `status`: siempre `preview_only`
- `payload`: solo campos admitidos por tipo
- `warnings`

Si OpenAI devuelve JSON invalido, tipos no permitidos o campos sensibles, la respuesta principal sigue funcionando y `actionProposals` queda vacio o saneado.

## UX

Las propuestas se muestran debajo de la respuesta de JARVIS con el aviso:

`Vista previa: todavía no se ejecuta ninguna acción.`

El boton de aprobacion aparece deshabilitado con el texto `Aprobación disponible en Sprint 11.2`.

## Fuera de Alcance

No hay ejecucion de acciones, aprobacion real, D1 writes, migraciones, endpoints adicionales, cambios en Cloudflare Access, nuevas dependencias ni cambios fuera del chat contextual.

## Sprint 11.2

Implementar el flujo privado de aprobacion humana para ejecutar propuestas validadas desde el backend, con endpoints especificos, auditoria y escrituras D1 controladas por tipo.
