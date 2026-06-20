# Auth interna retirada

La autenticacion propia de Sprint 3 queda retirada del camino operativo.

JARVIS ya no usa login interno, contrasena, hash PBKDF, cookie propia ni sesiones opacas para proteger la PWA o las APIs privadas.

La frontera actual esta documentada en:

```txt
docs/cloudflare-access.md
```

Las migraciones historicas que crearon `users` y `sessions` se conservan intencionalmente para no reescribir historial ni tocar D1, pero no deben usarse como mecanismo activo de autenticacion.

Antes de introducir datos sensibles o conectar Proyectos/Tareas reales a D1, confirma que Cloudflare Access protege produccion y previews y que Pages Functions valida correctamente `/api/access/me`.
