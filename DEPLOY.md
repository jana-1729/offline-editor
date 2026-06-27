# Deploying Tandem

Tandem has **three** deployable parts:

| Part | Where | Why |
|---|---|---|
| Next.js app | **Vercel** | SSR + API routes |
| Realtime WS server (`server/ws.ts`) | **Render / Railway / Fly** | needs persistent WebSockets (Vercel can't) |
| PostgreSQL | **Neon / Supabase / Railway** | managed DB |

> `AUTH_SECRET` **must be identical** on the app and the WS server (it signs &
> verifies the realtime token). `NEXT_PUBLIC_WS_URL` must be `wss://` in prod.

---

## 0. Push to GitHub

```bash
git init && git add -A && git commit -m "Tandem"
git branch -M main
git remote add origin https://github.com/<you>/tandem.git
git push -u origin main
```

## 1. Database — Neon (free)

1. Create a Neon project → copy the connection string (the default role is the
   project **owner**). This is your `DATABASE_ADMIN_URL`.
2. Apply schema + RLS **from your machine** (creates tables, policies, and the
   restricted `app_user` role):
   ```bash
   DATABASE_ADMIN_URL="postgres://<owner>:<pw>@<host>/<db>?sslmode=require" \
   DATABASE_URL="postgres://<owner>:<pw>@<host>/<db>?sslmode=require" \
   npm run db:migrate
   ```
3. Your **runtime** URL uses the `app_user` role the migration created
   (password `app_user`) — same host/db, different credentials:
   ```
   postgres://app_user:app_user@<host>/<db>?sslmode=require
   ```
   This is the `DATABASE_URL` for the app and WS server. Using a non-owner role
   is what makes RLS actually enforce.

## 2. WS server — Render (free)

New → **Web Service** → connect the repo:

- **Build:** `npm install`
- **Start:** `npm run ws`
- **Env vars:**
  - `DATABASE_URL` = the `app_user` URL from step 1
  - `AUTH_SECRET` = generate once (`openssl rand -base64 32`) and **save it**

Render gives `https://tandem-ws.onrender.com` → your WS URL is
`wss://tandem-ws.onrender.com`. (The server binds `$PORT` automatically.)

## 3. App — Vercel

Import the repo. Set **Environment Variables**:

| Var | Value |
|---|---|
| `DATABASE_URL` | the `app_user` URL from step 1 |
| `AUTH_SECRET` | **same value** you set on Render |
| `NEXT_PUBLIC_WS_URL` | `wss://tandem-ws.onrender.com` |
| `GOOGLE_API_KEY` | your Gemini key (optional) |
| `GEMINI_MODEL` | `gemini-2.5-flash` |

Deploy. (No `DATABASE_ADMIN_URL` on Vercel — migrations run from your machine.)

## 4. Verify

Open the Vercel URL → register → create a document. Open it in two browsers /
profiles, share with the second user, and confirm live editing + presence.

---

### Alternatives
- **Railway** can host the WS server *and* Postgres together (one project).
- **Fly.io** works for the WS server (`fly launch`, start command `npm run ws`).
- **Supabase** works as the DB; run the migration against its connection string.

### Gotchas
- 401/handshake failures on the socket → `AUTH_SECRET` differs between app & WS.
- Editor empty / no sync in prod → `NEXT_PUBLIC_WS_URL` wrong, not `wss://`, or
  the WS service is asleep (free tiers cold-start; first connect may lag).
- DB connection errors → append `?sslmode=require` to managed Postgres URLs.
