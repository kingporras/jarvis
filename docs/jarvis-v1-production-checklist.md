# JARVIS v1 - Production Checklist

Usar esta lista con una sesion real de Cloudflare Access en produccion. No crear bypasses ni escribir secretos en el repositorio.

## Pruebas manuales

1. Login Cloudflare Access.
2. Dashboard carga briefing real.
3. Crear tarea manual.
4. Crear memoria manual.
5. Crear decision manual.
6. Crear recordatorio manual.
7. Chat responde con contexto.
8. Chat propone accion.
9. Aprobar `create_task`.
10. Ver tarea creada.
11. Ver historial de acciones.
12. Exportar JSON.
13. Confirmar que export no incluye `owner_subject`, JWT, email, claims, API keys ni secretos.
14. Responsive movil.
15. Error controlado si OpenAI falla.

## Observaciones esperadas

- Las acciones no se ejecutan sin aprobacion humana.
- El historial muestra acciones ejecutadas o fallidas sin payload/result completo.
- Export JSON incluye `actionExecutions` con campos seguros.
- La sesion de OpenAI no depende de ChatGPT Plus ni cookies personales.
- Produccion puede requerir validar secretos de Cloudflare Pages desde dashboard, nunca desde el repo.

## Evidencia recomendada

- Captura de Dashboard con datos reales no sensibles.
- Captura de Chat con propuesta antes de aprobar.
- Captura de tarea creada despues de aprobar.
- Extracto revisado del export sin datos sensibles.
- Captura movil sin overflow horizontal.
