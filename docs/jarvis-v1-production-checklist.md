# JARVIS v1 - Production Checklist

Usar esta lista con una sesion real de Cloudflare Access en produccion. No crear bypasses ni escribir secretos en el repositorio.

## Acceso y lectura base

1. Entrar con Cloudflare Access.
2. Ver Dashboard y briefing real.

Resultado esperado: la app queda protegida por Access, el Dashboard carga datos reales y no aparece ningun error de autenticacion.

## CRUD manual principal

3. Crear proyecto manual.
4. Crear tarea manual.
5. Crear memoria manual.
6. Crear decision manual.
7. Crear recordatorio manual.

Resultado esperado: cada modulo crea datos propios del usuario autenticado y los muestra sin mezclar datos de otros owners.

## Chat contextual

8. Preguntar al Chat: "Resume mis prioridades actuales".
9. Preguntar al Chat: "Que deberia priorizar hoy".
10. Pedir propuesta: "Propon crear una tarea para revisar JANUS manana".
11. Revisar tarjeta de propuesta.

Resultado esperado: el Chat responde con contexto real, no ejecuta nada automaticamente y muestra la propuesta como accion que requiere aprobacion humana.

## Ejecucion aprobada y auditoria

12. Aprobar ejecucion.
13. Confirmar que la tarea aparece en Tareas.
14. Confirmar que aparece en Acciones recientes.

Resultado esperado: solo tras aprobar se crea la tarea, se registra auditoria en `action_executions` y el historial muestra la accion ejecutada.

## Export JSON

15. Probar Export JSON.
16. Confirmar que export incluye actionExecutions.
17. Confirmar que export NO incluye owner_subject/JWT/email/claims/API keys/secretos.

Resultado esperado: el archivo descargado incluye datos privados y `actionExecutions` seguros, sin payload/result completos ni secretos.

## Responsive y errores controlados

18. Probar responsive movil.
19. Probar error controlado si OpenAI falla o no esta configurado.
20. Confirmar que JANUS/Lenovo siguen aislados.

Resultado esperado: no hay overflow horizontal en movil, los errores OpenAI se muestran sin detalles internos y los nodos locales no reciben credenciales Cloud.

## Evidencia recomendada

- Captura de Dashboard con datos reales no sensibles.
- Captura de Chat con propuesta antes de aprobar.
- Captura de tarea creada despues de aprobar.
- Captura de Acciones recientes.
- Extracto revisado del export sin datos sensibles.
- Captura movil sin overflow horizontal.
