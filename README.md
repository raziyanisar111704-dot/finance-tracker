# Finance Tracker

Personal finance tracker built with the MERN stack: React + Vite + Tailwind, Express, and MongoDB Atlas. It is deployed free on Vercel.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, the database schema and the security decisions.

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

Don't set `NODE_ENV` (Vercel sets it to `production`) or `DNS_SERVERS` (local only).

After a deploy, check it from the outside:

```powershell
npm run check:deploy -- https://your-app.vercel.app
# Also signs up a throwaway account, uses it and deletes it again:
npm run check:deploy -- https://your-app.vercel.app --with-account
```

Atlas's free tier has no automatic backups: download **Settings → Export your data → Download backup (JSON)** regularly.

## Project layout

| Path | Purpose |
|---|---|
| `client/` | React frontend (Vite dev server proxies `/api` to Express) |
| `server/` | Express API (`src/app.js` builds the app, `src/server.js` runs it locally) |
| `api/index.js` | Vercel serverless entry: exports the same Express app |
| `vercel.json` | Build settings + routing (`/api/*` → API, everything else → React) |
