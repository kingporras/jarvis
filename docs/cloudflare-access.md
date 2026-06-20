# Cloudflare Access API boundary

Sprint 5 adopta Cloudflare Access como la unica autenticacion humana principal de JARVIS.

La proteccion queda en dos capas:

1. Cloudflare Access protege el acceso humano al sitio Pages en produccion y previews.
2. Pages Functions validan de nuevo el JWT de Access antes de permitir endpoints privados bajo `/api/*`.

El frontend sigue usando datos mock locales. No hay Proyectos reales, Tareas reales, Memoria real, IA, voz, integraciones, automatizaciones, agentes ni sincronizacion con Lenovo o Raspberry.

## Header esperado

Pages Functions leen el JWT solo desde:

```txt
Cf-Access-Jwt-Assertion
```

No se confia en emails enviados por headers arbitrarios, cookies sin validar, query params ni valores enviados por cliente.

## Variables de Cloudflare Pages

Configura estas variables no secretas en Cloudflare Pages:

```txt
CLOUDFLARE_ACCESS_TEAM_DOMAIN=https://<team-name>.cloudflareaccess.com
CLOUDFLARE_ACCESS_AUDS=<aud-produccion>,<aud-preview>
```

Reglas:

- `CLOUDFLARE_ACCESS_TEAM_DOMAIN` debe incluir `https://` y no llevar slash final.
- `CLOUDFLARE_ACCESS_AUDS` acepta varias audiences separadas por comas.
- Produccion y previews pueden tener Audience Tags distintos.
- No versionar `.dev.vars`.
- No guardar audiencias reales, tokens, service tokens ni secretos en el repositorio.

Para obtener los Audience Tags:

1. En Cloudflare Zero Trust, abre Access controls > Applications.
2. Entra en la aplicacion de produccion `jarvis-99b.pages.dev`.
3. Copia el Application Audience (AUD) Tag desde Additional settings.
4. Repite para la aplicacion de previews `*.jarvis-99b.pages.dev`.
5. Guarda ambos valores en `CLOUDFLARE_ACCESS_AUDS`, separados por comas, solo como variable de Cloudflare Pages.

No modifiques aplicaciones, politicas, audiencias ni duracion de sesion de Cloudflare Access desde codigo o terminal.

## Endpoints

### `GET /api/health`

Sigue siendo publico dentro de la API de JARVIS y no usa `requireAccess`.

Importante: Cloudflare Access puede seguir protegiendo el hostname. Por eso `/api/health` puede no ser accesible desde Internet sin pasar Access, aunque dentro de Pages Functions no requiera JWT.

### `GET /api/access/me`

Requiere un JWT valido de Cloudflare Access. Devuelve solo identidad minima:

```json
{
  "authenticated": true,
  "subject": "..."
}
```

Si Access entrega `email` como claim valido, tambien puede devolver:

```json
{
  "authenticated": true,
  "subject": "...",
  "email": "..."
}
```

No devuelve JWT, audience, issuer, claims completos, datos de sesion propia, datos de D1 ni configuracion.

## Validacion local

Localmente se puede comprobar:

- `/api/health` responde cuando D1 local esta disponible.
- `/api/access/me` sin configuracion critica falla cerrado con `503`.
- `/api/access/me` con configuracion no secreta temporal pero sin JWT falla cerrado con `401`.
- Un JWT falso o malformado no devuelve `200`.

La validacion completa con firma real requiere atravesar Cloudflare Access desde navegador, porque el JWT debe ser emitido por Access.

## Prueba manual en produccion y preview

No despliegues ni cambies politicas de Cloudflare Access desde codigo.

Produccion:

1. Abre `https://jarvis-99b.pages.dev` en navegador normal.
2. Completa Cloudflare Access si procede.
3. Confirma que el Command Center carga.
4. Visita `https://jarvis-99b.pages.dev/api/access/me`.
5. Confirma `200` con respuesta minima, sin token ni claims completos.

Incognito:

1. Abre produccion.
2. Confirma que Access impide llegar al contenido sin autenticacion.
3. Autenticate.
4. Repite `/api/access/me`.

Preview:

1. Abre una URL preview protegida.
2. Completa Access.
3. Repite `/api/access/me`.

Para `/api/health`, distingue entre "publico dentro de Functions" y "publico desde Internet". No cambies Access para alterar ese comportamiento durante este sprint.

## Lenovo y Raspberry

Lenovo y Raspberry siguen aislados:

- sin credenciales Cloudflare;
- sin tokens de nodo;
- sin sync automatica;
- sin heartbeat;
- sin colas;
- sin endpoints machine-to-machine.

## Proximos candidatos

- Sprint 6: Proyectos y Tareas reales en D1.
- Sprint 7: Memoria editable con fuente, prioridad, caducidad e historial.
- Sprint 8: Decisiones, Personas y Recordatorios reales.
- Fase posterior: briefing diario/semanal.
- Fase posterior: propuestas de accion con aprobacion y registro.
- Fase posterior: IA contextual.
- Fase posterior: voz manual push-to-talk.
- Fase posterior: Lenovo local y Raspberry Node, sin sincronizacion automatica hasta nueva decision explicita.
