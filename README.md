# Finance Tracker

Personal finance tracker built with the MERN stack: React + Vite + Tailwind, Express, and MongoDB Atlas. It is deployed free on Vercel and works on phones, tablets and computers, and can be installed as an app.

**Live:** https://finance-tracker-swart-psi.vercel.app

Features:
- income and expenses with categories, payment methods and notes
- search and filters
- dashboard with balance, monthly totals, budget alerts and charts
- monthly budgets with 80% / 100% warnings
- month, year and custom reports, with printing and PDF
- CSV import (bank statements) with preview, duplicate detection and undo
- CSV and JSON export
- password reset by email
- light and dark mode
- installable app that opens offline

## Documentation

| Document | For |
|---|---|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | **Using the app:** every screen, importing, printing, backups, FAQ. (The app itself has a short **Quick guide** page at `/guide`.) |
| [docs/MAINTENANCE.md](docs/MAINTENANCE.md) | **Looking after it:** setup, deploying, rollback, troubleshooting by symptom, password reset, backups, updates, future risks, where to change things |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | **How it's built:** design, database schema, calculations, security decisions, API |
| [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) | **What is tested** and the manual checks after each deploy |

## Requirements

- Node.js 24.x
- A MongoDB Atlas connection string (free M0 cluster)

## Run locally (Windows)

```powershell
# 1. Install everything (client + server) from the project root
npm install

# 2. Create your local env file, then edit it and paste your Atlas connection string
Copy-Item server\.env.example server\.env

# 3. Start the API (terminal 1) — http://localhost:4000
npm run dev:server

# 4. Start the frontend (terminal 2) — http://localhost:5173
npm run dev:client
```

To test on your phone over the same Wi-Fi, run `npm run dev:client -- --host`. Then open the "Network" URL that Vite prints.

## Tests

```powershell
# All automated tests (client calculations + API), from the project root.
# The API tests use a throwaway in-memory MongoDB, never your Atlas data.
npm test

# Known vulnerabilities in dependencies
npm audit
```

See [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) for what is checked and how.

## Deploy (Vercel + Atlas)

Every push to `main` deploys automatically. Production needs these Vercel
environment variables, set for the **Production** environment only (preview
deployments of other branches must not write into your real data):

| Name | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string for the app's database user |
| `MONGODB_DB_NAME` | `finance-tracker` |
| `JWT_SECRET` | 48+ random characters, different from your local one |
| `EMAIL_PROVIDER` | `brevo` (or `resend`), for "Forgot password?" emails |
| `EMAIL_API_KEY` | API key from Brevo / Resend |
| `EMAIL_FROM` | `Finance Tracker <your-verified-sender@gmail.com>` |
| `APP_URL` | `https://your-app.vercel.app` (used to build the link in the email) |

Don't set `NODE_ENV` (Vercel sets it to `production`) or `DNS_SERVERS` (local only).

After a deploy, check it from the outside:

```powershell
npm run check:deploy -- https://your-app.vercel.app
# Also signs up a throwaway account, uses it and deletes it again:
npm run check:deploy -- https://your-app.vercel.app --with-account
```

Atlas's free tier has no automatic backups: download **Settings → Your data → Download backup (JSON)** and the CSV regularly.

**Forgot password?** on the login page emails a reset link once email is set up on Vercel ([MAINTENANCE.md §5a](docs/MAINTENANCE.md#5a-setting-up-email-for-forgot-password-one-time-about-15-minutes)). Without email, set a new password from your computer with `npm run reset-password -- you@example.com`.

## Project layout

| Path | Purpose |
|---|---|
| `client/` | React frontend (Vite dev server proxies `/api` to Express) |
| `server/` | Express API (`src/app.js` builds the app, `src/server.js` runs it locally) |
| `api/index.js` | Vercel serverless entry: exports the same Express app |
| `vercel.json` | Build settings + routing (`/api/*` → API, everything else → React) + security headers |
| `scripts/check-deploy.mjs` | Checks a live deployment from the outside (`npm run check:deploy`) |
| `server/scripts/reset-password.js` | Sets a new password for an account (`npm run reset-password`) |
| `docs/` | User guide, maintenance guide, architecture, security checklist |
