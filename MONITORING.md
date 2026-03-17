# OmniHub — Monitoring & Logging Setup

## Architecture

| Layer | Hosting | Monitoring tool |
|---|---|---|
| Frontend (React) | Vercel | Sentry + Vercel Analytics + Speed Insights |
| Backend (Spring Boot) | Render | Sentry + Spring Actuator + Request logs |
| Database (PostgreSQL) | Neon | Neon built-in Monitoring tab |

---

## Environment Variables

You have **two isolated environments**. Each needs its own values.

### DEV — `backend/.env` (local file, never committed to Git)

```env
# ── Database (local PostgreSQL) ───────────────────────────────────────────────
DATABASE_URL=jdbc:postgresql://localhost:5432/omni_hub
DB_USERNAME=your_local_pg_username
DB_PASSWORD=your_local_pg_password

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET=any_long_random_string_for_local_dev

# ── Microsoft Graph (OneDrive / Outlook) ─────────────────────────────────────
MICROSOFT_CLIENT_ID=your_dev_app_client_id
MICROSOFT_CLIENT_SECRET=your_dev_app_client_secret
MICROSOFT_USER_ID=your_dev_user_id
MICROSOFT_REFRESH_TOKEN=your_dev_refresh_token
MICROSOFT_REDIRECT_URI=http://localhost:8080/auth/callback

# ── Monitoring (leave EMPTY locally — disables Sentry, no noise) ─────────────
SENTRY_DSN=
SENTRY_ENV=development
```

### DEV — `frontend/.env.local` (create this file in `frontend/`, never committed)

```env
REACT_APP_API_URL=http://localhost:8080

# Leave empty locally — Sentry only runs in production
REACT_APP_SENTRY_DSN=
```

---

### PROD — Render Environment Variables

Set these in: **Render dashboard → your backend service → Environment tab**

| Variable | Value | Where to get it |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://...neon.tech/...` | Neon → your project → Connection string (JDBC format) |
| `DB_USERNAME` | your Neon username | Neon → Connection details |
| `DB_PASSWORD` | your Neon password | Neon → Connection details |
| `JWT_SECRET` | a long random string (different from dev!) | generate: `openssl rand -hex 64` |
| `MICROSOFT_CLIENT_ID` | your prod Azure app client ID | Azure Portal → App registrations |
| `MICROSOFT_CLIENT_SECRET` | your prod Azure client secret | Azure Portal → App registrations → Certificates & secrets |
| `MICROSOFT_USER_ID` | your prod Microsoft user ID | Microsoft Graph Explorer |
| `MICROSOFT_REFRESH_TOKEN` | your prod refresh token | OAuth flow |
| `MICROSOFT_REDIRECT_URI` | `https://your-render-app.onrender.com/auth/callback` | Your Render URL |
| `SENTRY_DSN` | `https://xxxx@oXXX.ingest.sentry.io/XXXX` | Sentry → Settings → Projects → your Spring project → DSN |
| `SENTRY_ENV` | `production` | hardcode this |

---

### PROD — Vercel Environment Variables

Set these in: **Vercel dashboard → your project → Settings → Environment Variables**

> Make sure to select **Production** environment (not Preview or Development)

| Variable | Value | Where to get it |
|---|---|---|
| `REACT_APP_API_URL` | `https://your-render-app.onrender.com` | Your Render service URL |
| `REACT_APP_SENTRY_DSN` | `https://xxxx@oXXX.ingest.sentry.io/XXXX` | Sentry → Settings → Projects → your React project → DSN |

---

## One-Time Setup: Sentry (free tier)

> Sentry free tier: 5,000 errors/month — more than enough for a personal app.

### Step 1 — Create two Sentry projects
1. Go to [sentry.io](https://sentry.io) → sign up / log in
2. **New Project → React** → name it `omnihub-frontend` → copy the DSN
3. **New Project → Java/Spring** → name it `omnihub-backend` → copy the DSN
4. These are two different DSNs — one for Vercel, one for Render

### Step 2 — Add DSNs to each environment
- Paste the React DSN → Vercel env var `REACT_APP_SENTRY_DSN`
- Paste the Spring DSN → Render env var `SENTRY_DSN`
- Leave both **empty** in your local `.env` files (Sentry is a no-op when DSN is blank)

### Step 3 — Verify
Deploy to Render + Vercel → trigger any error → check **sentry.io → Issues tab**

---

## One-Time Setup: Vercel Analytics

1. Vercel dashboard → your project → **Analytics** tab → click **Enable**
2. Vercel dashboard → your project → **Speed Insights** tab → click **Enable**
3. Done — the `<Analytics />` and `<SpeedInsights />` components are already in `App.tsx`

---

## Where to See Logs Day-to-Day

### Backend errors and API timing
**Render → your service → Logs tab**

Every request is logged like this:
```
10:23:41.123 INFO  [http] GET  /api/transactions          200  43ms
10:23:42.456 WARN  [http] GET  /api/budgets               404  6ms
10:23:43.789 ERROR [http] GET  /api/transactions/recent   500  8ms  ← investigate these
```
- `INFO` = green (normal)
- `WARN` = yellow (4xx — usually a frontend bug or bad request)
- `ERROR` = red (5xx — backend threw an exception)

### Backend exception details
**sentry.io → omnihub-backend → Issues tab**
Full Java stack trace, which user triggered it, when it started happening.

### Frontend crashes
**sentry.io → omnihub-frontend → Issues tab**
Full React component stack, browser version, OS, user's email.

### Page views and visitors
**Vercel → Analytics tab**
Daily/weekly unique visitors, top pages, geographic breakdown.

### How fast pages load (Core Web Vitals)
**Vercel → Speed Insights tab**
LCP (Largest Contentful Paint), FCP, CLS per route — tells you if a page feels slow for real users.

### Database connections and query volume
**console.neon.tech → your project → Monitoring tab**
Active connections (should stay ≤ 5 with your HikariCP config), query rate, storage used.

### Slow SQL queries
**console.neon.tech → your project → Queries tab**
Lists the slowest queries. If something is slow here, add a DB index.

### Temporarily enable SQL logging (debugging only)
In `backend/src/main/resources/application.properties`:
```properties
logging.level.org.hibernate.SQL=DEBUG
```
SQL will appear in Render logs. **Turn this off after debugging** — very noisy.

---

## Health Check (Render uses this automatically)

Spring Actuator exposes:
```
GET https://your-render-app.onrender.com/actuator/health
→ { "status": "UP" }
```
Render pings this every 30 seconds. If it returns anything other than `UP`, Render marks the service as unhealthy and alerts you.

```
GET https://your-render-app.onrender.com/actuator/metrics
→ JVM memory, DB pool size, HTTP request counts
```

---

## Dev vs Prod — Key Differences

| | Dev (local) | Prod (Render/Vercel/Neon) |
|---|---|---|
| Sentry | **Disabled** (empty DSN) | **Enabled** |
| Vercel Analytics | Not running | **Enabled** |
| DB | Local PostgreSQL | Neon free tier |
| Log level | INFO | INFO (errors go to Sentry) |
| JWT secret | Any string | Long random secret (different from dev) |
| Microsoft redirect URI | `localhost:8080/...` | `your-render-url.onrender.com/...` |
