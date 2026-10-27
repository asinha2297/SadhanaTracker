# Sharanagati Sadhana Tracker

A daily sadhana tracker for the Sharanagati ISKCON congregation: japa, reading and hearing recorded in under two minutes a day, measured against effective-dated targets, with coordinator reports that never expose a devotee's reflections.

## Layout

| Path | What it is |
|---|---|
| `packages/domain` | Pure domain rules shared by client and server: totals, day status, streaks, effective-dated targets, week math, edit window, RBAC capabilities, identifier normalization, Zod schemas. |
| `packages/contract` | The HTTP contract (Zod request/response schemas) shared by the web app and the API. |
| `packages/fixtures` | Demo accounts, groups and a deterministic entry generator, used by the web mocks and the seed script. |
| `apps/web` | React 19 + Vite + Tailwind + Motion. Offline-capable (IndexedDB sync queue), MSW mocks for development. |
| `apps/api` | Express 5 + Drizzle ORM on PostgreSQL. Argon2id passwords, database-backed sessions, RBAC, SMS verification, rate limiting, CSV/XLSX export, audit log. |

## Getting started (development)

### 1. Prerequisites

- **Node.js 22 or newer** (`node -v`; built and tested on 24) with npm 10+.
- Nothing else. The database is embedded (PGlite, a real PostgreSQL inside the Node process) and in development verification codes are written to the log instead of being texted.

### 2. Install

```bash
git clone https://github.com/asinha2297/SadhanaTracker.git
cd SadhanaTracker
npm install
```

One install covers every workspace (`apps/*`, `packages/*`). If npm reports skipped install scripts, nothing here needs them.

### 3. Configure the backend

```bash
cp apps/api/.env.example apps/api/.env
openssl rand -base64 48        # paste the output as SESSION_SECRET in apps/api/.env
```

Everything else in `.env` can stay as it is for development: `NODE_ENV=development`, the embedded database, `SMS_PROVIDER=log`. The backend refuses to start without a `SESSION_SECRET`. The file is git-ignored; never commit it.

### 4. Create the database with demo data

```bash
npm run seed
```

Creates `apps/api/data/sadhana`, applies the migrations and loads 14 demo accounts with 120 days of entries. Run it once; if accounts already exist it does nothing.

### 5. Start the backend

```bash
npm run dev:api            # http://localhost:3000, restarts itself when code changes
```

Check it: `curl http://localhost:3000/api/health` → `{"ok":true}`.

### 6. Start the frontend

In a second terminal:

```bash
npm run dev:web:live       # http://localhost:5173, with /api proxied to the backend on 3000
```

Open **http://localhost:5173**. On Windows use PowerShell (`$env:VITE_API_MOCK="false"; npm run dev -w apps/web`) or cmd (`set VITE_API_MOCK=false && npm run dev -w apps/web`).

### 7. Sign in

Everyone signs in with a **mobile number or email** and a password. There is no public sign-up: a coordinator or an administrator creates each account on the *Master admin* page and hands over its one-time password in person. Demo accounts (password `haribol`):

| Who | Sign in with |
|---|---|
| Rādhikā Devī Dāsī, devotee | `98765 43210` or `radhika@example.org` |
| Govinda Dāsa, coordinator with record review | `98450 00007` |
| Lalitā Devī Dāsī, coordinator without record review | `98450 00011` |
| Nitāi Dāsa, administrator | `98450 00001` |
| Mādhava Dāsa, newcomer with one-time password `temp-1234` | `98450 00108` — must then choose a password |

Mobile numbers are matched loosely: `98765 43210`, `098765-43210` and `+91 98765 43210` are the same account. Devotee IDs (`SH-0042`…) identify people on the roster and in reports but are never typed to sign in.

### Verification codes

A devotee changing their own mobile number is texted a six-digit code. In development no SMS is sent; the code appears in the **backend terminal**:

```
SMS not sent (SMS_PROVIDER=log): Haribol! 931591 is your Sharanagati Sadhana Tracker code. It expires in 10 minutes.
```

### Frontend only (no backend)

```bash
npm run dev:web            # http://localhost:5173 against built-in mocks (MSW); needs no backend
```

Same demo accounts; data resets on reload; verification codes are printed in the browser console.

## Checking that everything works

### Automated checks

Run from the repository root; none of them need the servers running.

| Command | What it checks | Expected |
|---|---|---|
| `npm test` | Domain rules, the web app (jsdom + MSW) and the API (Supertest against a fresh in-memory PostgreSQL per file) | All three workspaces pass (241 tests at the time of writing) |
| `npm run typecheck` | TypeScript across every workspace | No output, exit code 0 |
| `npm run build` | Production builds: web → `apps/web/dist`, API → `apps/api/dist` | `✓ built`, and no `mockServiceWorker.js` in `apps/web/dist` |
| `npm audit --omit=dev` | Known vulnerabilities in production dependencies | `found 0 vulnerabilities` |

Run one workspace at a time with `npm test -w apps/api`, `npm test -w apps/web` or `npm test -w packages/domain`.

### Backend smoke test

With `npm run dev:api` running:

```bash
curl http://localhost:3000/api/health
# {"ok":true}

curl -c /tmp/sadhana.jar -H 'Content-Type: application/json' \
  -d '{"identifier":"98765 43210","password":"haribol"}' http://localhost:3000/api/auth/login
# {"user":{"devoteeId":"SH-0042","name":"Rādhikā Devī Dāsī","role":"DEVOTEE","mustChangePassword":false}}

curl -b /tmp/sadhana.jar http://localhost:3000/api/me/profile       # her profile
curl -b /tmp/sadhana.jar -X POST http://localhost:3000/api/auth/logout
curl -b /tmp/sadhana.jar http://localhost:3000/api/me/profile       # now 401: the session ended on the server
```

### Walk through the app

With both servers running, open http://localhost:5173:

1. **Welcome page** — signed out, `/` shows the landing page; *Sign in* leads to the login form.
2. **Devotee** — sign in with `98765 43210` / `haribol`. *Today* shows rings, streak and the week. *Record* saves today's rounds, reading and hearing; the dashboard then shows *Recorded*. *Week* and *History* show past days; days older than 7 are read-only.
3. **Offline** — in the browser's developer tools set the network to *Offline*, save an entry: the badge shows *Offline · 1 pending*. Go back online and it syncs.
4. **Profile** — the name is read-only; changing the mobile number asks for a verification code (printed in the backend terminal). Set a personal target from today onwards.
5. **Coordinator** — sign out, sign in with `98450 00007`. *Report* shows the congregation's week with a row per devotee (Govinda has record review; Lalitā, `98450 00011`, sees totals only). *Master admin* creates devotee accounts and hands over their one-time passwords; a coordinator cannot reset a coordinator's or administrator's password.
6. **Administrator** — sign in with `98450 00001`. On *Master admin*, create coordinators as well as devotees, rename, deactivate, grant *Record review* to a coordinator, and answer password-reset requests. On *Administration*, set the recommended target and read the audit log. *Export* gives CSV or Excel.
7. **Newcomer** — sign in with `98450 00108` / `temp-1234`: only the *Choose your own password* screen opens until a new password is set.
8. **Sign out everywhere** — on *More*, ends the session on every device, not just this one.

## Configuration

The backend reads `apps/api/.env` on start (for `npm run dev:api`, `npm run seed` and `npm start`); variables set in the real environment win over the file. [`apps/api/.env.example`](apps/api/.env.example) documents every setting. On a host, set the same variables in its environment settings instead of shipping a `.env`.

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `production` or `test`. **Unset means production.** |
| `SESSION_SECRET` | Required (32+ random characters). Signs session cookies; changing it signs everyone out. There is no built-in fallback. |
| `DATABASE_URL` | PostgreSQL connection string. Empty uses PGlite in `PGLITE_DIR`. |
| `SMS_PROVIDER` | How verification codes reach devotees: `twilio` (plus `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`) or `log`, which only writes them to the server log. Defaults to `log` in development; production refuses to start without an explicit choice. Another provider is one function in `apps/api/src/services/sms.ts`. |
| `TRUST_PROXY` | `false` when clients connect directly; otherwise the number of proxies in front (`1`), or an address list. Wrong values either let clients spoof their IP past rate limits or make everyone share one limit. |
| `COOKIE_SECURE` | Defaults to `true` everywhere except development. |
| `BOOTSTRAP_ADMIN_PHONE`, `BOOTSTRAP_ADMIN_PASSWORD` | On an empty database, creates administrator `SH-0001` with this mobile number and temporary password. |
| `ALLOW_DEMO_SEED` | `npm run seed` refuses to put demo accounts (known passwords) into `DATABASE_URL` unless `true`; it always refuses in production. |
| `WEB_DIST`, `PORT`, `LOG_LEVEL` | Built web app to serve (set by `npm start`), port (3000), pino log level (info). |

## Database

With no `DATABASE_URL` the backend runs **PGlite**, a real PostgreSQL embedded in the process and persisted to `PGLITE_DIR` (default `./data/sadhana`, relative to `apps/api`). To use a hosted or self-managed PostgreSQL instead, set `DATABASE_URL`; the schema and migrations (`apps/api/drizzle`) are identical and are applied automatically on start.

After changing `apps/api/src/db/schema.ts`, run `npm run db:generate -w apps/api` to produce a migration.

## Production

1. Build both apps: `npm run build` (web → `apps/web/dist` without the development mock worker, API → `apps/api/dist`).
2. Set the environment: `NODE_ENV=production`, `SESSION_SECRET`, `SMS_PROVIDER` (Twilio for public sign-up; `log` is allowed but then nobody receives codes), `DATABASE_URL` for a managed PostgreSQL (or keep PGlite on a persistent disk), `TRUST_PROXY=1` behind your reverse proxy, and on the very first start `BOOTSTRAP_ADMIN_PHONE` and `BOOTSTRAP_ADMIN_PASSWORD`.
3. Start: `npm start` serves the API and the built web app together on `PORT` (3000). Put it behind HTTPS; cookies are `Secure` in production. The reverse proxy must pass the browser's original `Host` or set `X-Forwarded-Host` (nginx: `proxy_set_header Host $host;`; Caddy and most platforms do this by default) and you set `TRUST_PROXY=1`, otherwise the cross-site check refuses browsers that lack Fetch Metadata (Safari before 16.4).
4. First sign-in: the bootstrap administrator signs in with that mobile number and temporary password and must choose a new one. Remove the two bootstrap variables afterwards. Administrators can add devotees without SMS (they hand over a one-time password in person); only public sign-up and mobile-number changes need SMS.

```bash
npm run build
NODE_ENV=production SESSION_SECRET=<32+ random chars> \
SMS_PROVIDER=twilio TWILIO_ACCOUNT_SID=AC… TWILIO_AUTH_TOKEN=… TWILIO_FROM=+1… \
DATABASE_URL=postgres://user:password@host:5432/sadhana?sslmode=require TRUST_PROXY=1 \
BOOTSTRAP_ADMIN_PHONE=+91… BOOTSTRAP_ADMIN_PASSWORD=<temporary password> \
npm start
```

## Security notes

- **No public sign-up.** Accounts are created by coordinators (devotees only) and administrators (any role), each with a generated one-time password that must be replaced at first sign-in. A devotee changing their own mobile number needs a six-digit code texted to it (10-minute expiry, 5 tries, one code a minute per number; signed-in devotees only). A number can belong to one account only.
- **Sessions live in the database.** The cookie (HttpOnly, SameSite=Lax, Secure outside development, 14 days) carries only a signed session id. Signing out ends that session on the server, so a copied cookie is useless afterwards; "Sign out everywhere", a password change and an administrator issuing a one-time password end every session of the account.
- Passwords: argon2id. A one-time password opens only the password screen until it is replaced (enforced by the API), and changing a password requires the current one.
- **Rate limits** are counted in the database, so they hold across several API instances: 5 failed sign-ins per identifier and 30 per address per 15 minutes; 30 reset requests or verification texts per address per 15 minutes.
- **Cross-site requests** that would change state are refused by Fetch Metadata (`Sec-Fetch-Site`) or, failing that, by comparing `Origin` with the request's host (`X-Forwarded-Host` behind a trusted proxy), on top of the SameSite cookie. The content security policy allows no inline scripts or styles.
- Request logs record method, URL and status only, never headers or cookies; unexpected errors are logged without query parameters. API responses are `Cache-Control: no-store`.
- Devotees cannot rename themselves; administrators correct names from the roster, and the change is audited. New devotee IDs are random six-digit numbers.
- Coordinators see the congregation's totals; a coordinator sees individual rows (numbers only, never reflections) only once an administrator grants them record review. Coordinators can create and reset devotee accounts only; other coordinators and administrators are administrators' business. The last active administrator cannot be demoted or deactivated. Targets cannot be dated in the past. CSV exports defuse spreadsheet formulas.
- Signing out clears the browser's cached data and the offline queue (after confirming if entries haven't synced).

Verification texts can only be requested by signed-in devotees, so nobody outside the congregation can make the API spend SMS.

## Troubleshooting

| Symptom | What to do |
|---|---|
| `SESSION_SECRET (at least 32 random characters) is required` | Step 3: create `apps/api/.env` and set the secret. |
| `The database already has accounts; nothing was seeded.` | Normal on a second run. To start over, stop the backend, delete `apps/api/data/sadhana` and seed again. |
| A migration fails on your old development database | Development data is disposable: delete `apps/api/data/sadhana` and seed again. |
| Port 3000 or 5173 is taken | `PORT=3001 npm run dev:api` and `API_URL=http://localhost:3001 npm run dev:web:live -- -- --port 5174` (the double `--` passes the port through two npm scripts to Vite). |
| "Code sent" but no SMS arrives | In development the code is in the backend terminal; in production set `SMS_PROVIDER=twilio`. |
| `403 {"reason":"CROSS_SITE"}` from a script or another site | The API accepts browser requests only from its own origin. Use the Vite proxy (same origin) in development; non-browser clients that send no `Origin` header are accepted. |
| Signed out unexpectedly after a deploy | A changed `SESSION_SECRET` or a password change ends sessions by design. |
