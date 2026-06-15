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
