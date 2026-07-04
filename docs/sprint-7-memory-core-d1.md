# Sprint 7.1 - Memory Core D1 private API

Sprint 7.1 prepares the real memory data core without connecting the visual Memory page.

## Scope

- Adds an additive D1 migration for memory ownership.
- Replaces the legacy memory API behavior with private owner-scoped handlers.
- Keeps Dashboard, Arc Core, Chat, Decisions, Persons, Reminders, Settings, UI and mocks unchanged.

## Model

Memory rows are owned by the Cloudflare Access subject:

```txt
owner_subject = identity.subject
```

The client cannot set or read `owner_subject`.

## Migration

`0004_memory_owner_subject.sql` adds:

- `memory_items.owner_subject`
- `memory_items.archived_at`
- owner-scoped indexes for updated time, status, type and priority

Legacy rows receive `__legacy_unowned__` as the owner sentinel.

## Private API

```txt
GET    /api/memory
POST   /api/memory
PATCH  /api/memory/:id
```

All routes require Cloudflare Access. Responses use `Cache-Control: no-store`.

## Out of scope

- Memory frontend integration.
- `memory_links` behavior.
- AI, RAG, embeddings, Vectorize, Workers AI or automations.
- Seeds, secrets, dependency changes or Cloudflare Access changes.
