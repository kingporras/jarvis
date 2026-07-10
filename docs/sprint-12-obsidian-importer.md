# Sprint 12.1 - Local Obsidian Vault Importer

Este sprint crea un importador local de Obsidian para convertir notas Markdown de una vault local en datos accionables de JARVIS: proyectos base, tareas, memorias, decisiones, recordatorios con fecha clara y registros de auditoria.

## Que hace

- Lee recursivamente archivos `*.md` desde una vault indicada por `--vault`.
- Genera un preview local en `.jarvis-imports/obsidian-import-preview.json`.
- Genera un reporte legible en `.jarvis-imports/obsidian-import-report.md`.
- En modo `apply`, escribe en D1 usando Wrangler y registra auditoria en `action_executions`.
- Usa IDs deterministas `obsidian_*_<hash>` para que una segunda ejecucion salte duplicados.

## Que no hace

- No conecta JARVIS Cloud directamente a Obsidian.
- No sincroniza automaticamente.
- No usa OpenAI, RAG, Vectorize, Workers AI ni red externa en preview local.
- No lee `.env`, `.dev.vars`, adjuntos, imagenes, audio, video, PDF ni carpetas internas de Obsidian.
- No modifica Cloudflare Access, `wrangler.toml`, migraciones, schema ni dependencias.
- No toca JANUS, Raspberry ni Lenovo fuera de la vault local indicada.

## Comandos

Preview local, sin escrituras D1:

```bash
node scripts/obsidian-importer.mjs --vault "C:\Users\nayar\Documents\Obsidian Vault" --mode preview
```

Apply local, con confirmacion explicita:

```bash
node scripts/obsidian-importer.mjs --vault "C:\Users\nayar\Documents\Obsidian Vault" --mode apply --target local --confirm APPLY_OBSIDIAN_IMPORT
```

Apply remoto, solo tras revisar un preview limpio y con confirmacion explicita:

```bash
node scripts/obsidian-importer.mjs --vault "C:\Users\nayar\Documents\Obsidian Vault" --mode apply --target remote --confirm APPLY_OBSIDIAN_IMPORT
```

Si `--target` no se indica, se usa `local`.

## Limites

- Maximo 300 notas Markdown.
- Maximo 5 MB totales de Markdown.
- Maximo 200 KB por nota.
- Si se supera un limite, el script se detiene y recomienda filtrar por subcarpeta.

## Extraccion determinista

El importador no interpreta con IA. Usa reglas fijas:

- Proyectos por carpeta, archivo, frontmatter `project`, tags y menciones claras.
- Tareas desde `- [ ]`, `TODO:`, `Pendiente:` y `Proximo paso:`.
- Memorias desde `Memoria:`, `Recordar:`, `Contexto:`, `Estado:`, `Arquitectura:`, `Decision tomada:` y `Regla:`.
- Decisiones desde `Decision:`, `Decidido:` y `Acordado:`.
- Recordatorios desde `Recordatorio:`, `Reminder:` y `Aviso:` solo si hay fecha ISO o espanola clara.

Las fechas relativas como `mañana`, `viernes` o `pronto` no se importan.

## Owner subject

El script nunca pide `owner_subject`. Lo obtiene consultando D1:

- Si hay exactamente un owner real, lo usa.
- Si no hay owner, aborta y pide crear primero un dato manual en JARVIS.
- Si hay mas de un owner, aborta para evitar mezclar datos.
- El owner completo no se imprime ni se guarda en los archivos de preview.

## Idempotencia

Cada candidato usa un hash estable basado en tipo, proyecto, archivo relativo, heading y texto normalizado. Antes de insertar, el script consulta IDs existentes:

- `obsidian_project_<hash>`
- `obsidian_task_<hash>`
- `obsidian_memory_<hash>`
- `obsidian_decision_<hash>`
- `obsidian_reminder_<hash>`

Si ya existe, se reporta como `skipped_existing`.

## Auditoria

En `apply`, cada elemento creado o saltado como existente registra una fila en `action_executions` con:

- `action_type = "obsidian_import"`
- `status = "executed"` o `"skipped_existing"`
- `target_type` y `target_id`
- `summary`
- `payload_json` saneado y minimo
- `result_json` minimo
- `warnings_json`

No se guarda el contenido bruto completo de una nota en auditoria.

## Revision del reporte

Revisa `.jarvis-imports/obsidian-import-report.md` antes de ejecutar `apply`. Debe mostrar:

- notas leidas e ignoradas;
- proyectos, tareas, memorias, decisiones y recordatorios a crear;
- duplicados posibles;
- elementos saltados;
- warnings y bloqueos.

La carpeta `.jarvis-imports/` esta ignorada por Git y no debe commitearse.

## Proximos pasos

- Permitir importar por subcarpeta para reducir ruido.
- Anadir una revision visual en JARVIS antes del apply remoto.
- Evaluar memory links a proyectos/tareas tras revisar la calidad del primer import.
- Disenar sincronizacion futura como sprint separado, con permisos y auditoria propios.
