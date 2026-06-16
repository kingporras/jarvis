# Auth privada de JARVIS

Sprint 3 anade autenticacion privada minima para un unico usuario: Victor.

No usa OAuth, magic links, email, JWT, OpenAI ni integraciones externas. La cookie contiene un token opaco HttpOnly y D1 guarda solo el hash SHA-256 del token en `sessions.token_hash`.

## Generar hash de contrasena

```bash
npm run auth:hash
```

El comando pide la contrasena sin mostrarla y devuelve un valor con este formato:

```txt
pbkdf2_sha256$310000$SALT_BASE64$HASH_BASE64
```

No guarda nada en disco y no imprime la contrasena.

## Configuracion local

Crea `.dev.vars` solo en tu maquina:

```txt
JARVIS_AUTH_PASSWORD_HASH="pbkdf2_sha256$310000$SALT_BASE64$HASH_BASE64"
JARVIS_SESSION_TTL_DAYS="14"
```

`.dev.vars` ya esta cubierto por `.gitignore`. No lo subas al repositorio.

## Configuracion en Cloudflare Pages

En Cloudflare:

1. Workers & Pages.
2. Proyecto `jarvis`.
3. Settings.
4. Environment variables.
5. Anadir `JARVIS_AUTH_PASSWORD_HASH` como secreto o variable protegida.
6. Opcional: anadir `JARVIS_SESSION_TTL_DAYS`.

En produccion la cookie `jarvis_session` usa `HttpOnly`, `Secure`, `SameSite=Lax` y `Path=/`.

## Migraciones

Local:

```bash
npm run d1:migrate:local
```

Remoto, cuando se apruebe aplicar Sprint 3 a produccion:

```bash
npm run d1:migrate:remote
```

No recrees `sessions`, no borres datos y no hagas reset destructivo de D1.

## Probar local

```bash
npm run build
npm run cf:dev
```

Endpoints:

```bash
GET /api/health
GET /api/auth/me
POST /api/auth/login
POST /api/auth/logout
GET /api/dashboard
```

Comportamiento esperado:

- `/api/health` es publico.
- `/api/auth/me` devuelve `401` sin sesion y `ok` con sesion valida.
- `/api/auth/login` devuelve `401` con contrasena incorrecta.
- `/api/auth/login` con contrasena correcta crea sesion y setea cookie HttpOnly.
- `/api/auth/logout` revoca la sesion y expira la cookie.
- `/api/dashboard`, `/api/projects`, `/api/tasks`, `/api/memory` y `/api/decisions` devuelven `401` sin sesion.
- Las rutas privadas de la app redirigen a `/login?next=<ruta>` sin sesion.

## Avisos

- No commitear contrasenas, hashes reales de produccion ni tokens.
- No guardar la contrasena en localStorage ni sessionStorage.
- No guardar tokens de sesion en D1 en claro.
- No aplicar seed remoto para probar auth.
- No hay auth multiusuario todavia.
