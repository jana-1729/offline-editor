# Local-First Collaborative Editor — Implementation Plan

> **For agentic workers:** Execute phase-by-phase. Steps use checkbox (`- [ ]`) syntax.
> **Constraint override:** NO git commits (user requirement). "Checkpoint" = verify, do not commit.

**Goal:** Build a local-first collaborative rich-text editor with offline sync, CRDT conflict resolution, version history, auth+roles, RLS, AI, and animated UX — running locally.

**Architecture:** Next.js 16 app + standalone Yjs WebSocket server + Postgres. IndexedDB is client source of truth; Yjs sync protocol reconciles. Drizzle ORM with Postgres RLS for tenant isolation.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, shadcn/ui, Framer Motion, Drizzle, Auth.js v5, Yjs, TipTap, ws, Vercel AI SDK (Gemini), Vitest, Playwright.

## Global Constraints

- Next.js 16, App Router, TypeScript strict.
- No git commits; no deployment (files only).
- Postgres RLS on all tenant tables.
- WS server enforces roles server-side; viewers cannot write.
- WS maxPayload 1MB + rate limit; all updates decoded in try/catch.
- Zod validates every API body/query.
- Footer placeholders `[YOUR NAME] · [GITHUB] · [LINKEDIN]` on all pages.
- AI gracefully degrades without `GOOGLE_API_KEY`.

---

## Phase 0 — Scaffold & Tooling
- [ ] Init Next.js 16 + TS + Tailwind v4 (`create-next-app`), App Router, src not used (root `app/`).
- [ ] Install deps: drizzle-orm, postgres, drizzle-kit, next-auth@beta, @auth/drizzle-adapter, bcryptjs, jose, zod, yjs, y-indexeddb, y-protocols, lib0, @tiptap/* + y-prosemirror, ws, ai, @ai-sdk/google, framer-motion, sonner, cmdk, next-themes, lucide-react, clsx, tailwind-merge, class-variance-authority.
- [ ] Dev deps: vitest, @vitejs/plugin-react, jsdom, @testing-library/react, @playwright/test, tsx, @types/ws, @types/bcryptjs.
- [ ] shadcn init + add: button, input, dialog, dropdown-menu, avatar, badge, card, tabs, tooltip, sonner, skeleton, scroll-area, separator.
- [ ] Config: `tsconfig` paths `@/*`, `.env.example`, `.env.local`, `drizzle.config.ts`, vitest config, playwright config.
- [ ] Checkpoint: `npm run build` scaffolds clean.

## Phase 1 — Database & RLS (Drizzle)
**Files:** `lib/db/schema.ts`, `lib/db/index.ts`, `lib/db/rls.ts`, `drizzle.config.ts`, `drizzle/` migrations.
- [ ] Schema: users, documents, document_members(role enum), doc_state, doc_updates, versions.
- [ ] `pgPolicy` RLS on documents/members/doc_state/doc_updates/versions keyed on `current_setting('app.current_user_id', true)::uuid`; enable RLS.
- [ ] `lib/db/index.ts`: postgres-js client + drizzle.
- [ ] `lib/db/rls.ts`: `withUser(userId, cb)` runs tx with `SET LOCAL app.current_user_id`.
- [ ] Generate + push migration to local PG.
- [ ] **Test (Vitest integration):** insert two users + docs; assert `withUser(A)` cannot read B's doc. Verify RLS isolation.
- [ ] Checkpoint: migration applies, RLS test passes.

## Phase 2 — Auth (Auth.js v5)
**Files:** `lib/auth/config.ts`, `lib/auth/index.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/api/register/route.ts`, `middleware.ts`, `lib/validation/auth.ts`.
- [ ] Credentials provider, JWT sessions, bcrypt verify; session carries userId.
- [ ] Register route: Zod-validated, hash password, create user.
- [ ] Middleware protects `(app)` routes.
- [ ] **Test:** register validation (Zod), password hashing round-trip, duplicate email rejected.
- [ ] Checkpoint.

## Phase 3 — Sync Engine (client) [TDD core]
**Files:** `lib/sync/connection-state.ts`, `lib/sync/ws-provider.ts`, `lib/sync/doc-manager.ts`, `lib/sync/reconcile.ts`.
- [ ] `connection-state.ts`: state machine `offline|connecting|syncing|online|error`, pure, event-emitting. **TDD: transitions.**
- [ ] `reconcile.ts`: helpers to encode/apply Yjs updates, compute restore-update (current→snapshot forward diff). **TDD: restore produces forward update, no data loss; concurrent merges converge.**
- [ ] `ws-provider.ts`: custom provider — Yjs sync protocol over WS, awareness, reconnect w/ backoff, drives connection-state.
- [ ] `doc-manager.ts`: create/get Y.Doc per id, attach y-indexeddb + ws-provider, expose status + awareness.
- [ ] Checkpoint: unit tests green.

## Phase 4 — WebSocket Server
**Files:** `server/ws.ts`, `server/rooms.ts`, `server/persistence.ts`, `server/rate-limit.ts`, `lib/auth/verify-token.ts`.
- [ ] JWT verify on connection (jose, shared secret).
- [ ] Room mgr: per-doc in-memory Y.Doc, peer set, awareness.
- [ ] Role gate: load membership; viewer connections drop update messages.
- [ ] Persistence: debounced snapshot→doc_state, append doc_updates, set RLS user.
- [ ] Hardening: maxPayload 1MB, token-bucket rate limit, try/catch decode.
- [ ] **Test (unit):** rate-limit bucket; malformed update rejected; viewer write ignored.
- [ ] Checkpoint.

## Phase 5 — REST API
**Files:** `app/api/documents/route.ts` (+ `[id]`), `app/api/documents/[id]/members/route.ts`, `app/api/documents/[id]/versions/route.ts` (+restore), `lib/validation/*.ts`, `lib/api/guard.ts`.
- [ ] CRUD documents (scoped via withUser). Create adds owner membership.
- [ ] Members: add/update/remove (owner only), role checks.
- [ ] Versions: list, capture (snapshot bytea), restore (returns snapshot for client forward-apply).
- [ ] Zod on every payload; `guard.ts` resolves session+role.
- [ ] **Test (integration):** owner CRUD; editor cannot manage members; viewer cannot capture version; cross-tenant blocked.
- [ ] Checkpoint.

## Phase 6 — UI: Auth + Dashboard
**Files:** `app/(auth)/login`, `app/(auth)/register`, `app/(app)/dashboard`, `components/footer.tsx`, `components/theme-*`, `app/layout.tsx`, `app/globals.css`.
- [ ] Theme provider (next-themes) + toggle, sonner Toaster, Framer Motion page transitions.
- [ ] Login/register forms (validated, animated, accessible).
- [ ] Dashboard: doc grid (owned+shared), create dialog, role badges, skeleton loaders, empty state, confetti on first doc.
- [ ] Footer placeholders on all pages.
- [ ] Checkpoint: flows work against API.

## Phase 7 — UI: Editor
**Files:** `app/(app)/doc/[id]/page.tsx`, `components/editor/*` (Editor, Toolbar, BubbleMenu, Presence, StatusPill, VersionTimeline, ShareDialog), `components/command-palette.tsx`.
- [ ] TipTap + y-prosemirror bound to doc-manager Y.Doc; offline-first load.
- [ ] Animated connection StatusPill from connection-state.
- [ ] Presence: remote cursors + selections + avatar stack (awareness), Framer Motion.
- [ ] Version timeline: list, capture, restore (forward-apply via reconcile), animated.
- [ ] Share dialog: manage members/roles (owner). Viewer = read-only editor + server enforced.
- [ ] Command palette (⌘K): search docs, actions, AI.
- [ ] Checkpoint: two browser tabs collaborate; offline edit reconnects + merges.

## Phase 8 — AI (Gemini)
**Files:** `lib/ai/gemini.ts`, `app/api/ai/route.ts`, `components/editor/ai-menu.tsx`.
- [ ] AI SDK + Gemini; actions: summarize, improve, suggestTitle; streaming.
- [ ] No-key graceful disable.
- [ ] Bubble menu AI actions with streaming typewriter output.
- [ ] **Test:** route returns 503 friendly when no key; Zod validates action.
- [ ] Checkpoint.

## Phase 9 — E2E, Docker, CI, README
**Files:** `tests/e2e/*.spec.ts`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `README.md`.
- [ ] Playwright: offline→reconnect→sync; two-client conflict merge; version restore; viewer cannot edit.
- [ ] Dockerfile (app), docker-compose (app+ws+pg).
- [ ] CI: install, lint, typecheck, unit tests, build.
- [ ] README: architecture, run steps, env, deploy notes, design tradeoffs, security write-up (OOM/RLS), footer-placeholder reminder.
- [ ] Checkpoint: `npm run lint && npm run typecheck && npm test && npm run build` all green; E2E pass.

---

## Self-Review — Spec Coverage
- Local-first → P3,P7. Background sync → P3,P4. Version/time-travel → P3(reconcile),P5,P7. Validation/OOM → P4,P5. Auth/roles → P2,P4,P5,P7. RLS → P1. AI → P8. UX/animation → P6,P7. Deploy/CI files → P9. Testing → P1,P2,P3,P4,P5,P8,P9. Footer → P6. All covered.
