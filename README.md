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

## Project layout

| Path | Purpose |
|---|---|
| `client/` | React frontend (Vite dev server proxies `/api` to Express) |
| `server/` | Express API (`src/app.js` builds the app, `src/server.js` runs it locally) |
| `api/index.js` | Vercel serverless entry: exports the same Express app |
| `vercel.json` | Build settings + routing (`/api/*` → API, everything else → React) |
