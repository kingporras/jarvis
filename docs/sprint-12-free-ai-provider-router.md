# Sprint 12.2 - Free AI Provider Router

Este sprint hace que OpenAI deje de ser obligatorio para JARVIS Chat. `/api/chat/context` sigue siendo una ruta privada protegida por Cloudflare Access, pero ahora selecciona proveedor por `AI_PROVIDER` y siempre puede responder con un fallback determinista basado solo en D1.

## Proveedores soportados

- `deterministic`: modo local sin IA externa. Es el valor por defecto si `AI_PROVIDER` falta o es invalido.
- `workers-ai`: usa Cloudflare Workers AI mediante el binding opcional `env.AI`.
- `openai`: usa OpenAI Responses API como proveedor opcional, igual que antes, si `OPENAI_API_KEY` y `OPENAI_MODEL` existen.

## Variables

Variables permitidas:

- `AI_PROVIDER`
- `WORKERS_AI_MODEL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_MAX_OUTPUT_TOKENS`

Valores recomendados:

```text
AI_PROVIDER=deterministic
WORKERS_AI_MODEL=@cf/qwen/qwen3-30b-a3b-fp8
```

No se anaden secrets, claves hardcodeadas ni dependencias nuevas.

## Workers AI en Cloudflare Pages

Para usar `AI_PROVIDER=workers-ai`, configura un binding de Workers AI llamado `AI` en Cloudflare Pages desde el dashboard del proyecto. En Pages Functions, Cloudflare expone ese binding como `env.AI`.

El codigo trata el binding como opcional:

- si `env.AI` existe, llama a `env.AI.run(model, input)`;
- si no existe, o si Workers AI falla, responde con fallback determinista;
- no usa streaming, tools, function calling, embeddings, Vectorize ni RAG.

El modelo por defecto si `WORKERS_AI_MODEL` falta es:

```text
@cf/qwen/qwen3-30b-a3b-fp8
```

## OpenAI opcional

`AI_PROVIDER=openai` usa OpenAI solo si `OPENAI_API_KEY` y `OPENAI_MODEL` estan configurados. Si faltan o la llamada falla, el Chat responde con fallback determinista. El frontend ya no depende de un error de OpenAI para informar al usuario.

## Fallback determinista

El fallback no llama a red externa ni a modelos. Usa el contexto D1 ya filtrado por el propietario autenticado:

- briefing;
- proyectos;
- tareas;
- memoria;
- decisiones;
- personas;
- recordatorios;
- enlaces de memoria.

Responde de forma razonable a preguntas como:

- `Resume JANUS`
- `Que proyectos tengo activos`
- `Que sabes del Inter de Verdun`
- `Que deberia priorizar ahora`
- `Que memoria has importado de Obsidian`
- `Que decisiones tengo abiertas`
- `Que recordatorios tengo`

No inventa datos y no genera `actionProposals`.

## Respuesta segura

La respuesta de `/api/chat/context` incluye metadata segura:

- `provider`
- `model`
- `fallbackUsed`
- `latencyMs`
- `requestId`
- `usedContext`
- `contextStats`

No devuelve `owner_subject`, JWT, email, claims, claves, secrets, raw prompt ni contexto completo.

## UX

La pagina `/chat` muestra:

- proveedor;
- modelo;
- fallback si/no;
- latencia;
- request id;
- contexto usado.

Si falta Workers AI u OpenAI, el usuario ve que esta activo el modo local determinista.

## Seguridad y alcance

No hay nuevas escrituras D1, migraciones, endpoints mutables, secrets ni variables sensibles. No se toca Cloudflare Access, Export JSON, acciones, historial, importador de Obsidian ni otras paginas.

## Limites y futuro

Workers AI requiere configurar el binding `AI` en Cloudflare Pages para probarlo en produccion. Gemini, Groq y OpenRouter quedan como alternativas futuras. Ollama/JANUS local queda para un bridge futuro separado, con permisos y auditoria propios.
