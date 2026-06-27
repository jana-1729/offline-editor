# Local-First Collaborative Document Editor — Design Spec

**Date:** 2026-06-27
**Assignment:** House of Edtech — Fullstack Developer Assignment 2 (v2.1)
**Constraint:** Build full app, run locally. Include deploy/CI files but do NOT commit or deploy.

## 1. Goal

A local-first collaborative rich-text editor that:
- Works fully offline (IndexedDB as primary source of truth, zero network blocking the UI)
- Syncs in the background and reconciles concurrent edits with **no data loss** (CRDT)
- Provides version history with safe "time travel" restore
- Enforces auth + Owner/Editor/Viewer authorization
- Hardens the sync server against malicious/oversized payloads (OOM)
- Ensures tenant isolation via Postgres RLS
- Ships AI add-ons (Gemini) and a polished, animated UX

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, TS) | Mandatory; SSR/RSC, API routes |
| Styling | Tailwind v4 + shadcn/ui + Radix | Mandatory Tailwind; accessible primitives |
| Animation | Framer Motion | Rich micro-interactions, layout animations |
| DB | PostgreSQL | Mandatory |
| ORM | Drizzle ORM (+ `pgPolicy`) | Type-safe; first-class RLS policy definitions |
| Auth | Auth.js v5 (Credentials, JWT) | Explicitly allowed; granular roles |
| CRDT | Yjs + `y-indexeddb` + custom WS provider | Deterministic conflict-free merge |
| Editor | TipTap (ProseMirror) + `y-prosemirror` | No lag on rapid typing; accessible; awareness/cursors |
| Realtime | Standalone Node `ws` server | Persistent WS (Vercel can't host); role gate + persistence |
| AI | Vercel AI SDK + `@ai-sdk/google` (Gemini) | Streaming AI features |
| Tests | Vitest + Playwright | Unit/integration + E2E around sync |
| Misc | sonner (toasts), cmdk (palette), next-themes | UX polish |

## 3. Processes (local dev)

1. **Next.js app** — UI, REST API, AI routes (`npm run dev`, :3000)
2. **WS server** — `server/ws.ts`, Yjs sync + auth/role enforcement + PG persistence (:1234)
3. **Postgres** — local (Postgres.app) or docker-compose

## 4. Local-First Architecture

- One `Y.Doc` per document. `y-indexeddb` persists it client-side → open/edit/close need no network.
- A custom **WebSocket provider** wraps the Yjs sync protocol (`y-protocols/sync` + `awareness`).
- **Offline:** edits accumulate in the Y.Doc (and IndexedDB). The provider tracks pending state; when offline it queues nothing extra (Yjs state vector handles diffing) but the **sync engine** records connection state and retries with backoff.
- **Reconnect:** sync protocol step1/step2 exchanges state vectors → only missing updates transfer in both directions → merge is conflict-free. Offline work is never overwritten.
- **Connection status** state machine: `offline → connecting → syncing → online` (+ `error`), surfaced in UI.

## 5. Data Model (Postgres)

- `users(id, email unique, password_hash, name, created_at)`
- `documents(id, title, owner_id, created_at, updated_at)`
- `document_members(document_id, user_id, role: owner|editor|viewer, PRIMARY KEY(document_id,user_id))`
- `doc_state(document_id PK, snapshot bytea, state_vector bytea, updated_at)` — squashed Yjs state
- `doc_updates(id, document_id, update bytea, created_at)` — append-only update log (drained/squashed periodically)
- `versions(id, document_id, label, snapshot bytea, created_by, created_at)` — named time-travel snapshots

**RLS:** every table has policies keyed on `current_setting('app.current_user_id')`. The WS server and API set this per transaction. Membership table drives document visibility. Drizzle query scoping is layered on top (defense in depth).

## 6. Sync Protocol & Server

- WS handshake: client passes JWT (from Auth.js) → server verifies, loads user + role for the doc room.
- Yjs sync messages relayed to room peers; awareness (presence/cursors) broadcast.
- Server applies updates to an in-memory `Y.Doc` per room, debounced-persists snapshot to `doc_state` and appends to `doc_updates`.
- **Viewer enforcement:** server drops/ignores any sync *update* messages from viewer connections (read-only). Owners/Editors may write.
- On last peer leave: final persist + evict room from memory.

## 7. Version History & Time Travel

- Yjs configured with `gc: false` so historical snapshots remain reconstructable.
- "Capture snapshot" → encode `Y.snapshot(doc)` (or full state) → `versions` row with label.
- Timeline panel lists versions (animated).
- **Restore = forward, non-destructive:** reconstruct doc-at-snapshot, compute the update that transforms current→snapshot, apply it as a normal Yjs update. Other collaborators receive it as a regular change; no hard reset, no corruption.

## 8. Security / Validation

- WS `maxPayload` = 1 MB; oversized frames closed.
- Per-connection rate limit (token bucket) on messages.
- Every Yjs update decoded inside try/catch before apply; malformed → reject + log, never crash.
- Zod schemas validate **every** HTTP API body and query.
- Auth required on every API route and WS connection.
- RLS guarantees no cross-tenant data even with a buggy query.
- Passwords hashed (bcrypt/argon2). JWT secret from env. Security headers.

## 9. AI Features (Gemini)

- `summarize` document, `improve`/`rewrite` selected text, `suggestTitle`.
- Streaming responses (typewriter). Floating bubble menu on selection.
- Behind an env-key abstraction; if `GOOGLE_API_KEY` absent, AI UI shows a friendly disabled state — core app fully works.

## 10. UX / Polish

- Framer Motion: page transitions, layout animations, spring micro-interactions.
- Live presence: smooth animated remote cursors, colored selections, avatar stack.
- Animated connection-status pill (morph + pulse + sync progress).
- Command palette (⌘K, cmdk): doc search, actions, AI commands.
- Optimistic UI, skeleton shimmer loaders, animated toasts (sonner).
- Dark/light theme (next-themes) with smooth transition.
- Accessible: keyboard nav, ARIA, visible focus rings, reduced-motion respected.
- Footer with placeholders: `[YOUR NAME] · [GITHUB] · [LINKEDIN]` on all pages.

## 11. Code Structure

```
app/
  (auth)/login, register
  (app)/dashboard, doc/[id]
  api/ (auth, documents, versions, members, ai)
components/        # shadcn-based + custom (editor, presence, status, palette, timeline)
lib/
  db/              # drizzle schema, client, RLS helpers
  auth/            # auth.js config
  sync/            # yjs setup, indexeddb, ws provider, connection state, reconciliation
  ai/              # gemini wrappers
  validation/      # zod schemas
server/ws.ts       # standalone yjs websocket server
drizzle/           # migrations
tests/             # unit, integration, e2e
Dockerfile, docker-compose.yml, .github/workflows/ci.yml
```

## 12. Testing Strategy

- **Unit (Vitest):** connection-state machine, reconciliation/restore logic, Zod validation, RLS scope helpers.
- **Integration:** API routes (auth, documents, versions, role checks), RLS isolation.
- **E2E (Playwright):** offline edit → reconnect → sync; two-client concurrent conflict merge; version capture + restore; viewer cannot edit.

## 13. Deliverables NOT committed/deployed

`Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml` included as files. No git commits. No Vercel deploy. User performs git + deploy later. README documents run + deploy steps.

## 14. Out of Scope (YAGNI)

Email verification, password reset, billing, file uploads, comments/threads, mobile native. Real-time cursors limited to current doc room.
