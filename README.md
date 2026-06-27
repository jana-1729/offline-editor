# Tandem — Local-First Collaborative Document Editor

A collaborative rich-text editor that **works fully offline** and reconciles
concurrent edits with **no data loss**. Built for the House of EdTech Fullstack
Assignment.

> **Footer:** the app footer shows the author's name, GitHub and LinkedIn.
> Replace the placeholders in [`components/footer.tsx`](components/footer.tsx)
> (`AUTHOR`) with your real details before submitting.

---

## Highlights

- **Local-first** — IndexedDB is the source of truth. Open, edit and close
  documents with zero network requests blocking the UI.
- **Conflict-free sync** — a Yjs CRDT merges concurrent edits deterministically;
  offline work is merged on reconnect, never overwritten.
- **Time travel** — capture named version snapshots and restore them as a
  *forward, non-destructive* operation that other collaborators receive like any
  edit (no hard reset, no corruption).
- **Realtime presence** — live remote cursors, selections and an avatar stack.
- **Auth + roles** — Owner / Editor / Viewer. Viewers are blocked from writing
  **server-side**, not just in the UI.
- **Tenant isolation** — Postgres Row-Level Security on every table.
- **Hardened sync** — 1 MB WS frame cap, per-connection rate limiting and
  defensive decoding so a malicious payload can't OOM or crash the server.
- **AI (Gemini)** — summarize, improve selection and suggest a title, streamed.
  The app works fully without an API key.
- **Polished UX** — floating selection toolbar, command palette (⌘K), animated
  connection status, dark (true-black) / light themes, Framer Motion throughout.

## Tech stack

Next.js 16 (App Router, TypeScript) · React 19 · Tailwind v4 + shadcn/ui ·
Framer Motion · Drizzle ORM + PostgreSQL · Auth.js v5 · Yjs · TipTap ·
`ws` realtime server · Vercel AI SDK (Gemini) · Vitest · Playwright.

## Architecture

Three processes run locally:

| Process | What it does | Port |
|---|---|---|
| **Next.js app** | UI, REST API, AI routes | 3000 |
| **WS server** (`server/ws.ts`) | Yjs sync relay, role enforcement, persistence | 1234 |
| **PostgreSQL** | Auth + documents + version snapshots | 5432 |

```
Browser ──IndexedDB (source of truth)──┐
   │  TipTap + Yjs                       │ offline-first
   │                                     │
   └── WebSocket (Yjs sync protocol) ──► WS server ──► Postgres (squashed state)
   └── HTTPS (REST: docs, members, versions, AI) ──► Next.js ──► Postgres (RLS)
```

See [`docs/superpowers/specs`](docs/superpowers/specs) for the full design spec
and [`docs/superpowers/plans`](docs/superpowers/plans) for the implementation
plan.

### Why these choices

- **Yjs (CRDT)** gives provably convergent merges. The offline queue,
  reconnect/backoff, version snapshots and the non-destructive restore are
  custom code on top (`lib/sync/*`).
- **Standalone WS server** because Next.js on serverless platforms can't hold
  long-lived WebSocket connections. It verifies a short-lived JWT on connect and
  enforces roles before applying any update.
- **Drizzle + RLS** — the app connects as a restricted, non-owner role so RLS is
  actually enforced (owners/superusers bypass RLS). Every request runs inside
  `withUser()`, which sets `app.current_user_id`; policies are keyed on it.

## Getting started (local)

Prerequisites: Node 20+, PostgreSQL 14+.

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local
#   - set AUTH_SECRET   (openssl rand -base64 32)
#   - point DATABASE_ADMIN_URL at a superuser; DATABASE_URL stays app_user
#   - optionally set GOOGLE_API_KEY to enable AI

# 3. Create the database (once)
createdb synced_docs

# 4. Apply schema + RLS migrations (also creates the app_user role)
npm run db:migrate

# 5. Run app + realtime server together
npm run dev:all
```

Open http://localhost:3000, register, and create a document. To see realtime
collaboration, open the same document in a second browser/profile after sharing
it.

### Run with Docker

```bash
AUTH_SECRET=$(openssl rand -base64 32) docker compose up --build
# → http://localhost:3000
```

Compose brings up Postgres, runs migrations once, then starts the app and WS
server.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev:all` | App + WS server (development) |
| `npm run dev` / `npm run ws` | Run either alone |
| `npm run db:generate` / `db:migrate` | Drizzle migrations |
| `npm run typecheck` / `lint` | Static checks |
| `npm test` | Unit + integration (Vitest) |
| `npm run test:e2e` | End-to-end (Playwright) |
| `npm run build` / `start` | Production build / serve |

## Environment

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Runtime, restricted `app_user` role (RLS enforced) |
| `DATABASE_ADMIN_URL` | migrations | Superuser; creates `app_user` + policies |
| `AUTH_SECRET` | yes | Auth.js + WS token signing (must match across app & ws) |
| `NEXT_PUBLIC_WS_URL` | yes | Browser → WS server URL |
| `WS_PORT` | yes | WS server bind port |
| `GOOGLE_API_KEY` | optional | Enables AI; app degrades gracefully without it |

## Testing

- **Unit** (`lib/**`, `server/**`): connection state machine, CRDT
  reconciliation + non-destructive restore, rate limiter, viewer write-rejection,
  validation, password hashing.
- **Integration** (`tests/integration`): RLS tenant isolation, registration,
  full documents/members/versions API with role checks, AI route guards.
- **E2E** (`tests/e2e`): local-first persistence, offline-edit → reconnect →
  sync, and two-user realtime convergence.

```bash
npm test          # unit + integration (needs Postgres)
npm run test:e2e  # end-to-end (auto-starts app + ws via Playwright)
```

## Security & real-world considerations

- **OOM / malicious payloads** — the WS server sets `maxPayload: 1 MB`
  (oversized frames are dropped by `ws`), applies a per-connection token-bucket
  rate limit, and decodes every Yjs message inside `try/catch` so malformed data
  can never crash a room. REST bodies are validated with Zod, and version
  snapshot uploads are size-capped.
- **Tenant isolation** — Postgres RLS on every table, enforced because the app
  connects as a non-owner role. Even a buggy/unscoped query cannot leak another
  tenant's rows.
- **Authorization** — roles are checked at the API layer *and* on the WS server,
  which silently drops write messages from viewer connections.
- **Document growth over time** — the server keeps a single squashed snapshot
  (`doc_state`) rather than an unbounded update log; the `doc_updates` table is
  reserved for an incremental log if horizontal scale is later needed.

## Deployment notes

- Deploy the **Next.js app** to Vercel/Netlify.
- Deploy the **WS server** (`server/ws.ts`) to a host that supports persistent
  connections (Railway, Render, Fly.io) and point `NEXT_PUBLIC_WS_URL` at it.
- Run `npm run db:migrate` against your managed Postgres (as a superuser) before
  first boot. CI is configured in `.github/workflows/ci.yml`.
