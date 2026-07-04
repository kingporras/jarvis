# Sprint 6 - Projects and Tasks real data vertical

Sprint 6 conecta por primera vez dos pantallas de JARVIS a datos reales:

- Proyectos.
- Tareas.

El resto del sistema sigue en modo mock local: Dashboard, Arc Core, Chat, Memoria, Decisiones, Personas, Recordatorios y Ajustes no leen ni escriben datos reales en este sprint.

## Access boundary

Todas las rutas privadas nuevas pasan por Cloudflare Access y `requireAccess()`.

El propietario del dato se obtiene exclusivamente desde el JWT validado:

```txt
owner_subject = identity.subject
```

No se usa email como clave de propiedad. El cliente no puede enviar ni modificar `owner_subject`, y las respuestas no lo devuelven.

## Modelo

La migracion `0003_projects_tasks_owner_subject.sql` es aditiva:

- anade `owner_subject` a `projects`;
- anade `completed_at` y `archived_at` a `projects`;
- anade `owner_subject` a `tasks`;
- anade `completed_at` a `tasks`;
- crea indices pequenos por propietario, estado, prioridad, proyecto y actualizacion.

Las filas legacy reciben un propietario sentinel interno para evitar que datos antiguos o seeds aparezcan como datos reales de Victor.

## API privada

Rutas implementadas:

```txt
GET    /api/projects
POST   /api/projects
PATCH  /api/projects/:id

GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
```

Reglas:

- todas las consultas filtran por `owner_subject`;
- todos los mutables validan JSON y campos conocidos;
- una tarea solo puede vincularse a un proyecto del mismo propietario;
- un recurso ajeno responde igual que uno inexistente: `404`;
- no hay `DELETE`;
- todas las respuestas privadas usan `Cache-Control: no-store`;
- no se devuelven JWTs, claims, audiencias, issuer, SQL ni detalles internos de D1.

## Frontend

Solo estas pantallas usan API real:

- `/projects`
- `/tasks`

No hay llamadas automatas a `/api/access/me`. No hay estado de sesion frontend. No hay login interno.

Los empty states indican cuando no hay datos reales. La UI no mezcla mocks con datos reales en Proyectos o Tareas.

## Produccion y previews

Antes de crear datos en preview, confirma si preview y produccion comparten el mismo binding D1. Si comparten D1, los datos creados desde preview pueden terminar en la misma base remota.

No crear seeds remotos para Sprint 6.

## Fuera de alcance

- Dashboard real.
- Memoria real.
- Decisiones reales.
- Personas reales.
- Recordatorios reales.
- IA, voz, automatizaciones, agentes, n8n, Gmail, Calendar, Drive, Slack, Linear.
- Lenovo o Raspberry.
- Secretos nuevos o `.dev.vars`.
