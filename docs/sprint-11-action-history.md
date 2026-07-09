# Sprint 11.3 - Action History & Clarification UX

## Endpoint

`GET /api/actions/history` devuelve el historial reciente de acciones de JARVIS.

El endpoint es privado, pasa por Cloudflare Access mediante el router existente y filtra siempre por el `owner_subject` autenticado. Acepta `limit`, con valor por defecto `10`, mínimo `1` y máximo `25`. La respuesta usa `Cache-Control: no-store`.

## Campos visibles

Cada item del historial expone solo:

- `id`
- `actionType`
- `status`
- `targetType`
- `targetId`
- `summary`
- `warnings`
- `errorCode`
- `createdAt`

## Campos excluidos

La respuesta no devuelve `owner_subject`, JWT, email, claims, API keys, prompts completos, contexto bruto, `payload_json` ni `result_json`.

## Aclaraciones

El Chat muestra mensajes concretos cuando una accion aprobada no puede ejecutarse:

- `409 TARGET_AMBIGUOUS`: pide concretar mejor nombre o ID.
- `404 TARGET_NOT_FOUND`: indica que no se encontro una entidad propia coincidente.
- `400 INVALID_PAYLOAD`: indica que la propuesta no tiene datos suficientes o validos.

Las acciones ambiguas o no encontradas no ejecutan mutaciones y mantienen la UI en estado de aclaracion cuando corresponde.

## Alcance

Sprint 11.3 no anade tipos nuevos de accion ni nuevas capacidades mutables. El historial es read-only y se basa en `action_executions`.

Sprint 11.4 puede cerrar la v1 con pulido final y pruebas de flujo completo en produccion con sesion Cloudflare Access real.
