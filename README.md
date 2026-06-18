# JARVIS

Private personal operating system for Victor: productivity, projects, memory, tasks and AI assistance.

Base frontend inicial de JARVIS como PWA responsive con React, Vite y TypeScript.

JARVIS es un sistema operativo personal privado para Victor. Este Sprint 1 solo crea el chasis visual y técnico: dashboard, navegación, páginas placeholder, componentes reutilizables, tema oscuro y configuración PWA básica. No incluye backend, login, OpenAI API, Cloudflare Workers, D1, integraciones, agentes ni persistencia real.

## Requisitos

- Node.js 20.19 o superior
- npm

## Desarrollo local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

La salida de producción se genera en:

```txt
dist
```

## Preview local

```bash
npm run preview
```

## Cloudflare Pages

- Deploy target: Cloudflare Pages
- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

## Sprint 2 - Backend base con Cloudflare D1

Sprint 2 anade Cloudflare Pages Functions bajo `/api/*`, migraciones D1, seed de desarrollo y configuracion Wrangler con binding `DB`.

Guia completa: [docs/sprint-2-backend-d1.md](docs/sprint-2-backend-d1.md)

## Sprint 3 - Auth privada

Sprint 3 anade login privado de usuario unico, sesiones opacas con cookie HttpOnly y hashes de sesion en D1.

Guia completa: [docs/auth.md](docs/auth.md)

## Sprint 3A - Passwordless Demo Mode

La autenticacion esta deshabilitada temporalmente para una fase publica de demo/desarrollo. Las rutas visuales de la PWA cargan sin login ni contrasena, pero esto no habilita APIs de datos ni escrituras publicas.

- El interruptor compartido esta en `shared/auth-config.ts` como `AUTH_ENABLED = false`.
- Mientras siga en `false`, no introduzcas datos personales, memoria real, tareas reales, proyectos reales, decisiones reales, secretos ni integraciones.
- Las rutas visuales son publicas temporalmente, pero los endpoints de datos bajo `/api/*` siguen cerrados sin sesion y el frontend no se conecta a D1.
- `sessions` y `migrations/0002_auth_sessions.sql` se conservan de forma intencional para reactivar auth mas adelante.
- Antes de usar informacion sensible o integraciones, cambia `AUTH_ENABLED` a `true` y configura `JARVIS_AUTH_PASSWORD_HASH` como secreto en Cloudflare Pages.

## Alcance de Sprint 1

- React + Vite + TypeScript
- CSS normal con variables
- App shell responsive
- Sidebar en escritorio
- Navegación inferior en móvil
- Páginas placeholder para Dashboard, Chat JARVIS, Memoria, Proyectos, Tareas, Decisiones, Personas, Recordatorios y Ajustes
- Manifest PWA básico, favicon e iconos placeholder

## Fuera de alcance

- Backend
- Cloudflare Workers
- Cloudflare D1
- OpenAI API
- Autenticación real
- Integraciones externas
- Automatizaciones
- CRUD real
- Service worker avanzado
