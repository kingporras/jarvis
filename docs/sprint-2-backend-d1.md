# Sprint 2 - Backend base con Cloudflare D1

Este sprint anade la base backend minima de JARVIS usando Cloudflare Pages Functions sobre Workers Runtime y Cloudflare D1.

No conecta OpenAI, no implementa auth real, no anade integraciones externas y no conecta todavia el frontend a la API.

## Que se ha anadido

- Configuracion de Wrangler en `wrangler.toml`.
- Binding D1 `DB` para la base `jarvis-db`.
- Migracion inicial en `migrations/0001_initial_schema.sql`.
- Seed de desarrollo en `seeds/dev_seed.sql`.
- API REST base en `functions/api/[[path]].ts`, disponible bajo `/api/*`.
- Scripts npm para migraciones, seed y Pages Functions local.

## Instalar dependencias

```bash
npm install
```

## Login en Cloudflare

```bash
npx wrangler login
```

## Crear la base D1

```bash
npx wrangler d1 create jarvis-db
```

Cloudflare devolvera un `database_id`. Copia ese valor en `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "jarvis-db"
database_id = "TU_DATABASE_ID_REAL"
```

No subas secretos al repositorio. El `database_id` identifica el recurso D1, pero no es una clave privada.

## Migraciones locales

```bash
npm run d1:migrate:local
```

## Seed local

```bash
npm run d1:seed:local
```

El seed usa `INSERT OR IGNORE`, por lo que puede ejecutarse varias veces durante desarrollo.

## Probar local

Primero genera `dist`:

```bash
npm run build
```

Despues levanta Cloudflare Pages Functions:

```bash
npm run cf:dev
```

Endpoints a probar:

- `/api/health`
- `/api/dashboard`
- `/api/projects`
- `/api/tasks`
- `/api/memory`
- `/api/decisions`

## Migraciones remotas

Ejecuta esto cuando `wrangler.toml` ya tenga el `database_id` real:

```bash
npm run d1:migrate:remote
```

## Seed remoto

Opcional y con cuidado. Solo ejecutalo si quieres insertar los datos mock de desarrollo en la D1 remota:

```bash
npm run d1:seed:remote
```

## Vincular D1 en Cloudflare Pages

En el dashboard de Cloudflare:

1. Workers & Pages.
2. Proyecto `jarvis`.
3. Settings.
4. Bindings.
5. Add binding.
6. D1 database.
7. Binding name: `DB`.
8. Seleccionar `jarvis-db`.

## Avisos

- No subir secretos.
- No conectar OpenAI todavia.
- No hay auth real todavia.
- No hay integraciones externas.
- La API queda preparada para Sprint 3.
