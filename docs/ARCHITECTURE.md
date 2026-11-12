# Personal Finance Tracker — Architecture & Plan

> Living document. Update it whenever a decision changes.
> Free-tier facts were checked on 2026-11-01. Providers change their plans, so re-check them before deploying.

---

## 1. Architecture (simplest practical option)

```
 Phone / Tablet / Desktop browser (also installable as an app)
                 │  HTTPS, same origin: https://<app>.vercel.app
                 ▼
 ┌──────────────────────── Vercel (Hobby, free) ────────────────────────┐
 │  /            → React + Vite static build (served from global CDN)   │
 │  /api/*       → Express app running as one Serverless Function       │
 └──────────────────────────────────┬───────────────────────────────────┘
                                    │ TLS + username/password (mongoose)
                                    ▼
                    MongoDB Atlas M0 (free, 512 MB)
```

**Why one host for both the frontend and the API?**

1. **Same origin means no CORS problems and no third-party cookies.** The login cookie belongs to the same site as the page. iOS Safari blocks cross-site cookies by default, and a split setup (`app.vercel.app` + `api.onrender.com`) breaks cookie login on iPhones. This is the biggest reason.
2. **No 1-minute "waking up" delay.** Render's free tier puts the server to sleep after 15 minutes of inactivity, and the next visit then waits around 30–60 seconds. A Vercel function cold-starts in about a second.
3. **One deployment, one set of environment variables, one dashboard.**

**This is still normal Express.** `server/src/app.js` builds a regular Express app:
- **Locally:** `server/src/server.js` calls `app.listen(4000)`.
- **On Vercel:** `api/index.js` just exports `app`.

The same code runs unchanged on Render, Koyeb, a VPS or your own PC, so you are not locked in.

**Trade-offs of the serverless approach (and how we handle them):**

| Issue | Mitigation |
|---|---|
| Each cold start opens a new DB connection | Cache the mongoose connection on `globalThis` and reuse it between invocations |
| In-memory rate limiting doesn't work (instances don't share memory) | Store rate-limit counters in MongoDB with a TTL index |
| No long-running background jobs (cron) | Generate recurring transactions "lazily" when you open the app (V2) |
| Function time limit (~10–60 s) | Our requests take milliseconds; CSV import is capped in size |

**Fallback:** if Vercel's terms or limits change, deploy `server/` to **Render** (free web service). Then add a Vercel rewrite `"/api/(.*)" → "https://<api>.onrender.com/api/$1"` so the browser still sees one origin. The cost is the Render cold-start delay.

---

## 2. Technology stack (zero-cost MVP)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19 + Vite, JavaScript | |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Dark mode via `class` strategy |
| Routing | React Router | |
| Server state | TanStack Query | Gives loading/error/retry/caching for free; ideal for flaky mobile networks |
| Charts | Hand-written SVG and HTML bars | No chart library: smaller download, full control over colours, accessibility and the table view |
| Backend | Node.js 24 LTS + Express 5 | Express 5 catches async errors automatically |
| Database | MongoDB Atlas M0 + Mongoose | |
| Validation | Zod | Same schemas style on server (and optionally client) |
| Auth | bcryptjs + jsonwebtoken + cookie-parser | `bcryptjs` is pure JS, so there are no native build problems on Windows |
| Security headers | helmet (API) + `vercel.json` headers (page) | CSP, no framing, nosniff |
| CSV | Own code: `server/src/utils/csv.js` (export), `client/src/lib/csvImport.js` (import) | Import is read in the browser; RFC 4180 quoting; 60 unit tests |
| Testing | Vitest + Supertest + mongodb-memory-server | Tests run against an in-memory MongoDB, not your real data |
| PWA (Phase 7) | Hand-written `client/public/sw.js` + `manifest.webmanifest` | No plugin; the service worker never stores `/api` responses |

Deliberately **not** included: Redux (TanStack Query + React context is enough), the `cors` package (same origin), Next.js (you want to learn Express), and a UI kit (Tailwind + our own small components).

---

## 3. Hosting & database comparison

### Database

| Option | Free allowance | Sleeps / pauses | Card? | Fit |
|---|---|---|---|---|
| **MongoDB Atlas M0** ✅ | 512 MB, shared CPU, ~100 ops/s, 500 connections, 1 free cluster per project | Paused after a long period (30–60 days, check the docs) with **zero** connections; data is kept and you resume it manually | No | Native to MERN; 512 MB ≈ well over a million transactions |
| Supabase (Postgres) | 500 MB DB, 2 free projects | Project **pauses after ~1 week** of inactivity | No | Great product, but SQL instead of MongoDB |
| Neon (Postgres) | ~0.5 GB, scale-to-zero | Compute sleeps when idle (fast wake) | No | Good; SQL |
| Local MongoDB | Unlimited | — | — | **Not reachable from your phone**, so it can't be the main option |

**Atlas M0 limitation that matters to us:** there are **no automated backups** on M0. Backups are therefore our own feature: JSON/CSV export plus a habit (monthly download).

### Frontend + API hosting

| Option | Free allowance (Hobby/free) | Sleep | Card? | Notes |
|---|---|---|---|---|
| **Vercel Hobby** ✅ | 100 GB transfer, 1M function invocations, 4 CPU-hours of function CPU/month, HTTPS | No sleep (function cold start ~1 s) | No | **Non-commercial personal use only**, which fits a personal tracker |
| Netlify Free | Static + functions, credit-based limits | No | No | Good alternative for the same architecture |
| Cloudflare Pages + Workers | Very generous static, 100k Worker requests/day | No | No | Express doesn't run natively on Workers, so code would need rewriting |
| Render Free (API only) | 750 instance-hours/month **per workspace** | **Sleeps after 15 min**, ~30–60 s wake | Usually no | Best fallback for running Express as a normal server |
| Railway / Fly.io | Trial credit or pay-as-you-go | — | Yes | **A trial is not free hosting.** Avoid |

### Hidden costs & what happens at the limits

- **Vercel Hobby** has no overage billing. If you exceed a limit, features pause or you're asked to upgrade. A personal app uses a tiny fraction (around 1–2% of the function allowance).
- **Atlas M0**: at 512 MB, writes are refused (reads still work). Never click "Upgrade" or enable paid backup; with no card on file, it cannot charge you.
- **Render** (if used): when you run out of hours, free services are suspended until the month resets.
- **Optional costs only:** a custom domain (~$10/yr). The free `*.vercel.app` subdomain with HTTPS is fine.
- **If a provider removes its free tier:** the code is portable. Frontend → Netlify or Cloudflare Pages; API → Render or Koyeb; DB → export JSON and import into another Atlas account or a self-hosted MongoDB.

---

## 4. Version 1 scope (MVP) vs future

### V1: essential finance tracking
- Register, log in, log out, delete account
- Default categories seeded at sign-up, plus custom categories (create, rename, archive)
- Transactions: add, edit, delete; income/expense, date, amount, category, payment method, notes
- Transaction list: search, filter by date range, category and type; pagination
- Dashboard: month income, expenses, net savings, savings rate, balance, spending by category, recent transactions, 6-month income-vs-expense chart, change vs previous month
- Monthly budgets per category, spent vs remaining, warnings at 80% and 100%, "copy last month's budgets"
- Monthly and yearly summary report, custom date range
- CSV export and full JSON backup
- Responsive layout (phone bottom nav, desktop sidebar), light/dark mode
- Deployed with HTTPS and tested on phone and desktop

### V1.1 (done in Phase 7)
- Installable app (PWA): home-screen icon, shortcuts, opens offline with a clear message
- CSV import with column matching, preview, duplicate detection, row-by-row errors and undo
- Printable report view (print stylesheet; "Save as PDF" from the print dialog)
- Password reset by email (Brevo or Resend web API; see §8)

### V2+: future enhancements
- Savings goals with contributions and progress bars
- Recurring rules (salary, rent, subscriptions) with **scheduled** vs **posted** transactions
- Offline viewing of data + queued offline entries (needs encrypted on-device storage)
- Advanced reports (trends, year-over-year), multiple accounts/wallets
- Bank import via an aggregator: only after evaluating cost, security and privacy

---

## 5. Folder structure

```
finance-tracker/
├── api/
│   └── index.js               # Vercel entry: `export default app`
├── client/                    # React + Vite frontend
│   ├── public/                # favicon, icons/, manifest.webmanifest, sw.js, theme.js
│   ├── src/
│   │   ├── api/               # fetch wrapper + one module per resource
│   │   ├── components/
│   │   │   ├── ui/            # Button, Input, Card, Modal, Spinner, EmptyState…
│   │   │   ├── layout/        # AppShell, Sidebar, BottomNav, Header
│   │   │   └── charts/
│   │   ├── features/          # auth, dashboard, transactions, import, categories, budgets, reports, settings, theme
│   │   ├── hooks/
│   │   ├── lib/               # money.js, dates.js, csvImport.js, pwa.js, print.js, queryClient.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js         # dev proxy /api → http://localhost:4000
│   └── package.json
├── server/                    # Express backend
│   ├── src/
│   │   ├── config/            # env.js (validated env vars), db.js (cached connection)
│   │   ├── models/            # User, Category, Transaction, Budget, RateLimit
│   │   ├── validators/        # Zod schemas per resource
│   │   ├── middleware/        # requireAuth, validate, rateLimit, errorHandler
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/          # summaries, reports, default categories
│   │   ├── utils/             # money.js, dates.js, AppError.js
│   │   ├── app.js             # builds the Express app (no listen)
│   │   └── server.js          # local dev: connect DB + listen
│   ├── scripts/               # reset-password.js (admin: set a forgotten password)
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md        # this file
│   ├── USER_GUIDE.md          # how to use the app
│   ├── MAINTENANCE.md         # running, deploying, updating, troubleshooting
│   └── SECURITY_CHECKLIST.md  # what is tested and how
├── scripts/
│   └── check-deploy.mjs       # checks a live deployment from outside
├── vercel.json
├── .gitignore
└── README.md
```

**How the pieces talk:** the browser loads React from `/`. React calls `fetch('/api/transactions', { credentials: 'include' })`. In development, Vite's proxy forwards `/api` to Express on port 4000. In production, Vercel routes `/api/*` to the function. Express checks the session cookie, validates input with Zod, runs a Mongoose query **scoped to your user id**, and returns JSON.

---

## 6. Money, dates & financial accuracy

### Money: integers in minor units
- Store `amountMinor` as an **integer** (₹1,234.50 → `123450` paise; $12.34 → `1234` cents).
- **Why:** `0.1 + 0.2 === 0.30000000000000004` in JavaScript. Summing integers is exact. JS integers are exact up to 9 quadrillion, far beyond any personal budget.
- **Alternative considered:** MongoDB `Decimal128`. It's exact too, but JS has no native decimal type, so every value needs conversion. More friction, no benefit here.
- Amounts are **always positive**; `type` (`income`/`expense`) decides the sign. That way a negative number can never be added twice or with the wrong sign.
- Conversion happens only at the edges: parse user input `"1,234.50"` → `123450` (string parsing, no float multiplication), display with `Intl.NumberFormat`.
- Percentages (savings rate, budget used) are calculated at the end and rounded only for display.

### Dates: calendar dates, not timestamps
- A transaction's `date` is stored as a **`"YYYY-MM-DD"` string** (the day you choose in the form).
- **Why:** timestamps shift across time zones. An expense at 11 pm in India is "yesterday" in UTC, which would push it into the wrong month. A calendar-date string never shifts, sorts correctly as text, and month ranges become simple: `date >= "2026-11-01" && date <= "2026-11-30"`.
- The user's IANA time zone (e.g. `Asia/Kolkata`) is stored in settings and used only to decide what "today" and "this month" mean.
- `createdAt`/`updatedAt` remain real timestamps (UTC) for auditing.

### Definitions (so totals always agree)
Implemented in `server/src/services/summary.service.js` → `computeTotals()`:

| Field | Formula |
|---|---|
| `incomeMinor` | sum of `income` transactions dated in the period |
| `expenseMinor` | sum of all `expense` transactions (includes transfers to savings categories) |
| `savedMinor` | the part of `expenseMinor` in categories with `isSavings: true` (Savings, Investments) |
| `spendingMinor` | `expenseMinor − savedMinor`: real spending |
| `netMinor` | `incomeMinor − expenseMinor`: cash left after all outflows |
| `totalSavingsMinor` | `incomeMinor − spendingMinor`: everything not spent |
| `savingsRate` | `totalSavingsMinor ÷ incomeMinor` as %, 1 decimal; `null` when income is 0 |

- **Balance** = opening balance (setting) + all income − all expenses dated on or before the balance date. The balance date is today for the current month, and the last day of the month otherwise.
- **Month-over-month change** = `(current − previous) ÷ previous`, `null` when previous is 0.
- **Budget usage** = expenses in *that category* dated in *that budget's month*, from the same `sumByCategory()` the dashboard uses.
  - **warning** at ≥ 80%, checked as `spent × 5 ≥ limit × 4`, so there's no rounding.
  - **exceeded** at > 100%.
- **"Today" / "this month"** come from `todayIn(user.timezone)`.
- **Empty periods** return zeros, empty arrays and `null` percentages, never errors.

---

## 7. Database schema (Mongoose)

```js
User {
  email:            String, unique, lowercase, trimmed
  passwordHash:     String           // bcrypt, never returned by the API
  name:             String
  currency:         String, default "INR"           // ISO 4217
  timezone:         String, default "Asia/Kolkata"  // IANA
  openingBalanceMinor: Number (int), default 0
  tokenVersion:     Number, default 0 // bump to log out all devices
  resetTokenHash:   String, select:false  // SHA-256 of the emailed reset token
  resetTokenExpiresAt: Date, select:false // 30 minutes after the request
  timestamps
}

Category {
  userId:    ObjectId → User, indexed
  name:      String (1–40 chars)
  type:      "income" | "expense"
  isSavings: Boolean, default false  // Savings, Investments
  color:     String (hex)
  icon:      String (icon key)
  archived:  Boolean, default false  // archive instead of hard delete
  timestamps
  unique index: { userId, type, nameLower }
}

Transaction {
  userId:        ObjectId → User
  type:          "income" | "expense"
  amountMinor:   Number (int, > 0, ≤ 1e13)
  categoryId:    ObjectId → Category  // must belong to same user AND same type
  date:          String "YYYY-MM-DD"
  paymentMethod: "cash" | "debit_card" | "credit_card" | "upi" | "bank_transfer" | "wallet" | "other"
  notes:         String (≤ 500 chars)
  isRecurring:   Boolean, default false   // V1: simple tag; V2: recurringRuleId
  importId:      String (UUID), optional  // set by CSV import; "Undo this import" deletes by it
  timestamps
  indexes: { userId: 1, date: -1 }, { userId: 1, categoryId: 1, date: -1 },
           { userId: 1, importId: 1 } (only rows that have an importId)
}

Budget {
  userId:      ObjectId → User
  categoryId:  ObjectId → Category (expense)
  month:       String "YYYY-MM"
  limitMinor:  Number (int, > 0)
  unique index: { userId, categoryId, month }
}

RateLimit {                      // shared counters for serverless
  key:       String, unique      // e.g. "login:<ip>" or "login:<email>"
  count:     Number
  expiresAt: Date, TTL index (MongoDB deletes automatically)
}

// V2
Goal          { userId, name, targetMinor, targetDate, contributions: [{ amountMinor, date, note }] }
RecurringRule { userId, template: {type, amountMinor, categoryId, paymentMethod, notes},
                frequency: "weekly"|"monthly"|"yearly", interval, startDate, endDate?, nextDate }
                // occurrences show as "Scheduled" until confirmed → then a real Transaction is created
```

**Default categories seeded at sign-up**
- **Expense:** Groceries, Rent & Housing, Utilities, Transportation, Healthcare, Shopping, Education, Entertainment, Dining, Investments*, Savings*, Other (* `isSavings`)
- **Income:** Salary, Freelance, Interest, Gifts, Other Income

**Category deletion safeguard:** a category that has transactions can't be hard-deleted. You either archive it (hidden from forms, kept in history) or move its transactions to another category first.

---

## 8. Authentication & privacy

**Sign-up / log-in flow**
1. Your password is sent over HTTPS, then hashed with **bcrypt (cost 12)**. Only the hash is stored. bcrypt is deliberately slow and salted, so a stolen database can't be reversed quickly. bcrypt reads only the first 72 bytes, so new passwords are limited to 72 bytes as well as 64 characters (Hindi letters and emoji take 3–4 bytes each).
2. On success, the server signs a **JWT** `{ sub: userId, tv: tokenVersion }`, valid 7 days, with a secret from env vars.
3. The JWT goes into a cookie with these flags:
   - `HttpOnly`: JavaScript can't read it, so an XSS bug can't steal it (unlike `localStorage`).
   - `Secure`: sent only over HTTPS (in production).
   - `SameSite=Lax`: not sent on cross-site form posts, which blocks most CSRF attacks.
   - `Path=/`.
4. As an extra CSRF guard, every POST/PUT/PATCH/DELETE with an `Origin` header from another site is refused with 403 (`sameOriginOnly` middleware). Bodies must also be JSON, which a plain HTML form on another site cannot send.
5. "Log out everywhere" increments `tokenVersion`, which invalidates every old token.

**Authorization (keeping each user's data private)**
- `requireAuth` middleware verifies the cookie and sets `req.userId`.
- **Every** query includes `userId: req.userId`, e.g. `Transaction.findOne({ _id: id, userId })`. Another user's ID simply returns 404, which doesn't reveal that it exists.
- When creating a transaction or budget, the server checks that `categoryId` belongs to the same user. Without this check, a classic bug (IDOR) would let someone attach your data to their category.

**Other protections**
- Zod validation on every body and query. Unknown fields are stripped; values that aren't strings are rejected, which blocks NoSQL injection such as `{ "$gt": "" }`.
- Rate limits (stored in MongoDB, so all serverless instances share them): login 10 attempts / 15 min per IP and per email; register 5 / hour per IP; delete account 5 / 15 min per user. The response is the same for "wrong email" and "wrong password".
  - Trade-off: the per-email limit means someone who knows your email can block logins to it for up to 15 minutes. Accepted, because it is what stops password guessing spread across many computers.
- `helmet` security headers on the API; JSON body limit 1 MB (2 MB for CSV import only); `Cache-Control: no-store` on every API response.
- The page itself gets headers from `vercel.json`: a Content Security Policy that allows only this site's own scripts, styles and connections (an injected `<script>` is refused), `frame-ancestors 'none'` + `X-Frame-Options: DENY` (no clickjacking), `nosniff`, `Referrer-Policy: same-origin`. For this, the theme script lives in `client/public/theme.js` instead of inline in `index.html`.
- Central error handler: logs details server-side and sends users a generic message (no stack traces).
- Secrets only in env vars (`.env` is gitignored; `.env.example` is committed).
- Atlas: a dedicated DB user with `readWrite` on **only** the app database, plus a long random password, with TLS enforced.
  - **Honest limitation:** Vercel functions have changing IPs, so Atlas network access must allow `0.0.0.0/0`. Security then relies on the strong credentials and TLS, which is standard for this setup.
- We never store bank passwords, card numbers, PINs or CVVs. Only amounts, categories and your notes.

**Password reset by email**
1. **Forgot password?** → `POST /api/auth/forgot-password { email }`. The answer is always the same ("If an account exists…"), and nothing is sent for unknown addresses.
2. For a real account: 32 random bytes (base64url) become the token. Only its **SHA-256 hash** and an expiry (**30 minutes**) are stored, so a database leak can't be used to reset passwords. A new request replaces the old token.
3. The link is built from the `APP_URL` setting, **never from the request's Host header**, which an attacker could forge to point the link at their own site.
4. The email is sent through Brevo's or Resend's web API with `fetch` (`services/email.service.js`). Locally it's printed in the terminal; in tests it's kept in memory.
5. The reset page moves the token out of the address bar (into history state) as soon as it opens. The page loads nothing from other sites, and `Referrer-Policy: same-origin` keeps the token from leaking through referrers.
6. `POST /api/auth/reset-password { token, password }`: same password rules as sign-up. A single atomic update sets the new hash, removes the token (single use) and bumps `tokenVersion`, which logs out every device. It also lifts the per-email login lock and sends a "password was changed" email.
7. Limits: 3 reset emails/hour per address, 5/hour per IP; 10 reset attempts/15 min per IP.

**Account deletion:** requires retyping your password. It deletes all transactions, budgets and categories, then the user. The UI suggests downloading a backup first.

---

## 9. API overview

```
POST   /api/auth/register         POST /api/auth/login        POST /api/auth/logout
POST   /api/auth/forgot-password  POST /api/auth/reset-password
GET    /api/auth/me               PATCH /api/auth/me (settings) DELETE /api/auth/me

GET    /api/categories            POST /api/categories
PATCH  /api/categories/:id        DELETE /api/categories/:id  (blocked if in use → archive)

GET    /api/transactions?from&to&type&categoryId&q&page&limit
POST   /api/transactions          PATCH /api/transactions/:id DELETE /api/transactions/:id

GET    /api/budgets?month=YYYY-MM PUT /api/budgets (upsert)   DELETE /api/budgets/:id
POST   /api/budgets/copy          { fromMonth, toMonth }

GET    /api/summary/month?month=YYYY-MM        (dashboard cards + category breakdown + vs previous)
GET    /api/summary/trend?months=6             (income vs expense chart)
GET    /api/reports?from&to                    (custom range / yearly)

GET    /api/export/transactions.csv            GET /api/export/backup.json
POST   /api/transactions/import/check     { rows: [{date,type,amountMinor}] } → { duplicates: [index…] }
POST   /api/transactions/import           { rows: [...] } → { importId, count }
                                           all or nothing; ≤ 2,000 rows; 2 MB body; 20 imports/hour/user
DELETE /api/transactions/import/:importId → { deleted }  (undo)
GET    /api/health
```

---

## 10. Roadmap (part-time, ~1–2 h/day)

| Phase | Goal | Estimate | Done when… |
|---|---|---|---|
| 1. Planning | This document, accounts ready | 1–2 days | You agree with the plan; accounts created |
| 2. Setup | Monorepo, Vite + Tailwind, Express, Atlas connected, Git/GitHub. **Deploy a "hello" skeleton to Vercel** | 2–3 days | `/api/health` returns `{ db: "ok" }` on your phone over HTTPS |
| 3. Backend | Models, auth, CRUD, summaries, validation, tests | 1–2 weeks | All endpoints pass tests (Supertest + in-memory DB) |
| 4. Frontend | Layout, auth pages, dashboard, transactions, categories, budgets, reports, export | 2–3 weeks | Full V1 usable locally on phone and desktop sizes |
| 5. Testing & security | Calculation tests, auth/IDOR tests, responsive checks, `npm audit` | 3–5 days | Checklist complete |
| 6. Deployment | Production env vars, Atlas user, final deploy | 1–2 days | **Milestone:** add on phone → see it on desktop |
| 7. Improvements | PWA ✅, CSV import ✅, print view ✅; password reset by email ✅; next: goals, recurring, change password in Settings | Ongoing | Driven by real use |

> Phase 2 includes an early skeleton deployment. This is slightly earlier than the original plan, but it shakes out deployment and environment-variable problems while the app is tiny, when they're easy to debug.

---

## 11. Limitations of the zero-cost approach

1. **No automatic DB backups (Atlas M0).** Use in-app backup export monthly; consider keeping copies in Google Drive.
2. **Free plans can change.** The code is portable (see section 3); the cost of moving is about an hour.
3. **Vercel Hobby is non-commercial.** Fine for personal use. If you ever sell this as a product, you'd need a paid plan.
4. **Shared DB performance (~100 ops/s).** It's irrelevant for one person, but this isn't for thousands of users.
5. **Atlas auto-pause** after a long period with zero connections. Daily use prevents it; if it happens, click "Resume" in Atlas (no data is lost).
6. **Password reset emails need a free email account** (Brevo). Sending "from" a Gmail address through it may land in Spam until marked "Not spam"; a custom domain fixes that. Without email, `npm run reset-password` (see MAINTENANCE.md) still works for the owner.
7. **Open DB network access (`0.0.0.0/0`).** Mitigated by strong credentials and TLS.
8. **Offline:** the installed app opens without a connection, says so, and loads by itself on reconnect. Financial data is deliberately *not* stored on the device, so it can't be viewed or edited offline (V2).
9. **Backup size:** a Vercel function response is limited to ~4.5 MB. A JSON backup reaches that at roughly 15,000+ transactions (years of daily use). Before then, add a date-range option or split the backup into parts.
10. **Currency is a display setting, not a conversion.** Amounts are stored in minor units of the chosen currency. Switching between currencies with different decimal places (e.g. INR with 2 → JPY with 0) would change how stored amounts read. Pick the currency once.
