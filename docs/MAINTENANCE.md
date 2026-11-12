# Finance Tracker: maintenance & troubleshooting

How to run, deploy, update and fix the app **on your own**. Keep this file next to the code; it's written so that you don't need an AI assistant to look after the site.

- How to *use* the app: [USER_GUIDE.md](USER_GUIDE.md)
- How it is *built* (design, database, security reasoning): [ARCHITECTURE.md](ARCHITECTURE.md)
- What is *tested*: [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)

---

## Contents

1. [Quick reference](#1-quick-reference)
2. [Where everything lives](#2-where-everything-lives)
3. [Setting up on a new computer](#3-setting-up-on-a-new-computer)
4. [Making a change, step by step](#4-making-a-change-step-by-step)
5. [Environment variables and secrets](#5-environment-variables-and-secrets)
6. [Deploying, checking and rolling back](#6-deploying-checking-and-rolling-back)
7. [Where to look when something breaks](#7-where-to-look-when-something-breaks)
8. [Troubleshooting by symptom](#8-troubleshooting-by-symptom)
9. [Reset a forgotten password](#reset-a-forgotten-password)
10. [Backups and restoring data](#10-backups-and-restoring-data)
11. [Regular maintenance calendar](#11-regular-maintenance-calendar)
12. [Updating dependencies safely](#12-updating-dependencies-safely)
13. [Future risks and what to do](#13-future-risks-and-what-to-do)
14. [Common changes: which files to edit](#14-common-changes-which-files-to-edit)
15. [How the code fits together (short tour)](#15-how-the-code-fits-together-short-tour)
16. [Getting help without Claude](#16-getting-help-without-claude)

---

## 1. Quick reference

| What | Where / command |
|---|---|
| Live site | https://finance-tracker-swart-psi.vercel.app |
| Health check | https://finance-tracker-swart-psi.vercel.app/api/health → `{"status":"ok","db":"ok",…}` |
| Code | https://github.com/raziyanisar111704-dot/finance-tracker (branch `main`) |
| Hosting | Vercel → project **finance-tracker** (region Mumbai, `bom1`) |
| Database | MongoDB Atlas → free **M0** cluster, database `finance-tracker` |

All commands run in **PowerShell** from the project folder (`finance-tracker`):

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Start the API (terminal 1) | `npm run dev:server` → http://localhost:4000 |
| Start the website (terminal 2) | `npm run dev:client` → http://localhost:5173 |
| Open on your phone (same Wi-Fi) | `npm run dev:client -- --host`, then the "Network" URL |
| Run all tests | `npm test` |
| Check for known vulnerabilities | `npm audit` |
| Production build (what Vercel runs) | `npm run build` |
| Check the live site | `npm run check:deploy -- https://finance-tracker-swart-psi.vercel.app` |
| …including sign-up and the database | add `--with-account` |
| Set a new password for an account | `npm run reset-password -- you@example.com` ([details](#reset-a-forgotten-password)) |

---

## 2. Where everything lives

| Service | What it holds | What you need to log in |
|---|---|---|
| **GitHub** | The code and its full history. Pushing to `main` deploys | Your GitHub account (`raziyanisar111704-dot`) |
| **Vercel** (Hobby, free) | Builds and serves the site and the API; holds the production secrets | Your Vercel account (usually "Continue with GitHub") |
| **MongoDB Atlas** (M0, free) | All accounts and financial data | Your Atlas account, plus the **database user** and its password inside the connection string |
| **Your computer** | `server/.env` with your **local** secrets (never committed) | — |

**Write these down in a password manager now:**

- Atlas account login, and the Atlas **database user** name and password for production and for local development.
- The production `JWT_SECRET` (it's also visible in Vercel, but a copy helps if you ever move hosts).
- Your own app password.

If the GitHub, Vercel and Atlas logins are safe, everything else can be rebuilt from this folder.

---

## 3. Setting up on a new computer

1. **Install the tools:**
   - **Node.js 24 LTS** from https://nodejs.org (the version must match `"engines"` in `package.json`; check with `node -v`)
   - **Git** from https://git-scm.com
   - **VS Code** (optional)
2. **Get the code:**
   ```powershell
   git clone https://github.com/raziyanisar111704-dot/finance-tracker.git
   cd finance-tracker
   npm install
   ```
3. **Create the local settings file:**
   ```powershell
   Copy-Item server\.env.example server\.env
   notepad server\.env
   ```
   - `MONGODB_URI`: in Atlas: **Database → Connect → Drivers**, copy the string, and put in the user name and password. Use a **separate local database name** or a separate DB user, so local experiments never touch real data. The simplest way is `MONGODB_DB_NAME=finance-tracker-dev`.
   - `JWT_SECRET`: generate one:
     ```powershell
     node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
     ```
4. **Run it:** `npm run dev:server` in one terminal and `npm run dev:client` in another, then open http://localhost:5173.
5. **Run the tests once:** `npm test`. The first run downloads a temporary MongoDB for the tests (a few hundred MB, only once) and can take a few minutes.

---

## 4. Making a change, step by step

1. **Pull the latest code:** `git pull`
2. **Start both servers** (section 3). The page reloads by itself as you save files; the API restarts by itself (`node --watch`).
3. **Make the change.** Section 14 says which files to edit for common changes.
4. **Test:**
   ```powershell
   npm test          # 251 automated tests (server + client)
   npm run build     # proves the production build works
   ```
   Also try the change on a phone-sized window: in the browser press `F12`, then the phone/tablet icon.
5. **Commit and push:**
   ```powershell
   git add .
   git commit -m "Short description of the change"
   git push
   ```
6. **Vercel deploys automatically** (about 1 minute). Then check the live site:
   ```powershell
   npm run check:deploy -- https://finance-tracker-swart-psi.vercel.app
   ```
7. **If it's broken, roll back** first and investigate afterwards (section 6).

> **Golden rule:** never edit code directly on GitHub or Vercel. Change it locally, run `npm test`, then push.

---

## 5. Environment variables and secrets

| Name | Local (`server/.env`) | Vercel (Settings → Environment Variables, **Production** only) |
|---|---|---|
| `MONGODB_URI` | Atlas string for your dev database user | Atlas string for the production database user |
| `MONGODB_DB_NAME` | e.g. `finance-tracker-dev` | `finance-tracker` |
| `JWT_SECRET` | any 48+ random characters | **different** 48+ random characters |
| `PORT` | `4000` | don't set |
| `NODE_ENV` | `development` | don't set (Vercel sets `production`) |
| `DNS_SERVERS` | only if you get `querySrv ECONNREFUSED` (section 8) | **never** |
| `EMAIL_PROVIDER` | leave unset: reset emails are **printed in the API terminal** | `brevo` (or `resend`) |
| `EMAIL_API_KEY` | leave unset | the API key from Brevo / Resend |
| `EMAIL_FROM` | leave unset | `Finance Tracker <your-verified-sender@gmail.com>` |
| `APP_URL` | leave unset (defaults to `http://localhost:5173`) | `https://finance-tracker-swart-psi.vercel.app` (no `/` at the end) |

Without the four email variables the live site works normally, except **Forgot password?**, which answers *"Password reset by email is not set up on this site yet."* `npm run check:deploy` reports it as a FAIL until it's set up.

The server checks these at start-up and stops with a clear list if one is missing or wrong (`Invalid environment variables: …`).

**After changing a variable on Vercel you must redeploy:** Deployments → ⋯ on the latest → **Redeploy**. Existing deployments keep the old values.

### 5a. Setting up email for "Forgot password?" (one time, about 15 minutes)

The app sends two emails: the reset link and "your password was changed". It uses an email service's web API. **Brevo** is the default because its free plan can send from a single verified address (your Gmail) without owning a domain. Its free plan was about 300 emails a day when this was written; check the current plan on brevo.com.

1. **Create a Brevo account** at https://www.brevo.com (free plan, no card). Complete the profile questions; Brevo may need to activate your account before it sends.
2. **Verify a sender:** Brevo → your name (top right) → **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender**.
   - Name: `Finance Tracker`. Email: the address the emails should come from (e.g. your Gmail).
   - Brevo emails that address a code or link: confirm it.
3. **Create an API key:** Brevo → **SMTP & API** → **API Keys** → **Generate a new API key**, named `finance-tracker`. Copy it now (it's shown once). Treat it like a password.
4. **If Brevo's "Authorized IPs" security option is on, turn it off** (Security → Authorized IPs). Vercel's addresses change, so an IP allow-list would block every email.
5. **Add the variables on Vercel** → Settings → Environment Variables, **Production** only:
   - `EMAIL_PROVIDER` = `brevo`
   - `EMAIL_API_KEY` = the key
   - `EMAIL_FROM` = `Finance Tracker <the-verified-address@gmail.com>`, exactly the address verified in step 2
   - `APP_URL` = `https://finance-tracker-swart-psi.vercel.app`

   Then Deployments → ⋯ → **Redeploy**.
6. **Test:**
   - `npm run check:deploy -- https://finance-tracker-swart-psi.vercel.app` should show `PASS  Password reset by email is set up`.
   - Then try it for real: log out → **Forgot password?** → your email → open the link → choose a new password.

**Spam folder:** an email "from" a Gmail address but sent by Brevo can't be fully verified by Gmail, so the first one may land in **Spam**. Mark it **Not spam** and later ones usually arrive normally. For the best delivery, buy a domain (about ₹800–1,000 a year) and add it in Brevo (Senders, Domains → **Domains** → authenticate, which adds SPF/DKIM records); then use `EMAIL_FROM=Finance Tracker <no-reply@yourdomain.in>`.

**Using Resend instead** (https://resend.com): it needs your own domain to email anyone except yourself.
- Add and verify the domain in Resend.
- Create an API key.
- Set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, and `EMAIL_FROM=Finance Tracker <no-reply@yourdomain.in>`.

**Locally** nothing needs setting up: when you use *Forgot password?* on http://localhost:5173, the email, including the link, is printed in the terminal running `npm run dev:server`.

**Adding another provider later:** the sending code is in `server/src/services/email.service.js`. Each provider is one small `fetch` call, and the message texts are at the bottom of the file.

### Rotating secrets (if one leaks, or once a year)

| Secret | How | Effect |
|---|---|---|
| **Atlas database password** | Atlas → **Database Access** → the user → **Edit** → new password. Update `MONGODB_URI` on Vercel (and locally) → **Redeploy** | The site is down for the minute between the two steps |
| **`JWT_SECRET`** | Generate a new one (section 3), put it on Vercel → **Redeploy** | **Everyone is logged out** (all old sessions stop working). No data is lost |
| **`EMAIL_API_KEY`** | Brevo → SMTP & API → API Keys: create a new key, put it on Vercel → **Redeploy**, then delete the old key in Brevo | None, if done in that order |

If `server/.env` was ever committed or shared by mistake, rotate **both**: removing the file from Git does not remove it from history.

---

## 6. Deploying, checking and rolling back

- **Deploy** = push to `main`. Watch it in Vercel → **Deployments** (Building → Ready).
- **Check** = `npm run check:deploy -- https://finance-tracker-swart-psi.vercel.app`. All lines should say `PASS`; any `FAIL` names what's wrong.
  - Read-only by default.
  - `--with-account` also creates a throwaway account (`deploy-check-…@example.com`), adds and imports a transaction, reads it back, then deletes the account.
- **Roll back:** Vercel → **Deployments** → the last good deployment → ⋯ → **Instant Rollback** (or **Promote to Production**). The site switches back within seconds. Then fix the problem locally, test, and push again.
  - A rollback changes only the code. Database changes are **not** undone, which is another reason to take backups.
- **Build failed on Vercel?** The site keeps serving the previous version; nothing is broken for users. Open the failed deployment → **Build Logs**, read the first red error, and fix it locally (`npm run build` shows the same error).

---

## 7. Where to look when something breaks

Look in this order. The error message almost always tells you what's wrong; read it slowly before changing anything.

1. **Is it the database?** Open `/api/health`.
   - `"db":"ok"`: the database is fine.
   - `"db":"error"` / 503: see "Database unavailable" in section 8.
2. **The browser's developer tools** (`F12`):
   - **Console**: red errors from the page (also Content Security Policy errors).
   - **Network**: click the failing `/api/…` request → **Response** shows the server's JSON error, e.g. `{"error":{"message":"…"}}`.
   - **Application → Service workers / Storage**: the installed app's cache (see "Old version keeps showing" below).
3. **Vercel logs:** project → **Logs** (runtime). Filter by status `500`. The server writes the full error here, while users only see "Something went wrong". Build problems are under **Deployments → (deployment) → Build Logs**.
4. **Atlas:** Cluster overview (paused? storage nearly full?), **Database Access** (user and password), **Network Access** (must include `0.0.0.0/0`).
5. **Reproduce locally:** run the app (section 3) and repeat the same steps. The terminal running `npm run dev:server` shows the full error.

---

## 8. Troubleshooting by symptom

### On your computer (development)

| Message / symptom | Cause | Fix |
|---|---|---|
| `npm : File …\npm.ps1 cannot be loaded because running scripts is disabled` | PowerShell's script policy | Once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then reopen PowerShell |
| `'node' is not recognized` / wrong `node -v` | Node not installed or not on PATH | Install Node 24 LTS, then **reopen** the terminal (or VS Code) |
| `Invalid environment variables: MONGODB_URI …` | `server/.env` missing or a value is wrong | `Copy-Item server\.env.example server\.env` and fill it in (section 3) |
| `querySrv ECONNREFUSED _mongodb._tcp…` | Your network's DNS can't look up Atlas addresses (common on some Wi-Fi and ISPs in India) | Add `DNS_SERVERS=8.8.8.8,1.1.1.1` to `server/.env` (**local only**), or switch network |
| `bad auth : authentication failed` | Wrong database user or password in `MONGODB_URI` | Check it in Atlas → Database Access. Special characters in the password (`@ : / ? # %`) must be URL-encoded (`@` → `%40`), or use a password without them |
| `connection <monitor> … closed` / `ETIMEDOUT` / server selection timed out | Your IP isn't allowed, or the cluster is paused | Atlas → **Network Access** must include `0.0.0.0/0` (or your IP); cluster → **Resume** if paused |
| `EADDRINUSE: address already in use :::4000` | The API is already running in another terminal | Close the other terminal, or: `Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess \| Stop-Process` |
| Page loads but every action fails; Vite prints `http proxy error … ECONNREFUSED` | The API isn't running | Start `npm run dev:server` in a second terminal |
| `403 Cross-site requests are not allowed` locally | Opened the API port directly, or changed `changeOrigin` in `vite.config.js` | Always use http://localhost:5173; keep `changeOrigin: false` |
| `npm install` fails with `ERESOLVE` | Conflicting package versions after an update | Undo the update (`git checkout package.json package-lock.json`, then `npm install`); see section 12 |
| `npm test` hangs or times out on first run | The temporary test MongoDB is downloading | Wait (once only); a stable connection helps. Antivirus can also block it: allow `mongod.exe` in `%USERPROFILE%\.cache\mongodb-binaries` |
| Tests fail after your change | The tests found a real difference | Read the first failure: it says the expected and the actual value. Fix the code, or update the test only if the behaviour change was intended |

### On the live site

| Message / symptom | Cause | Fix |
|---|---|---|
| "The database is temporarily unavailable" (503), `/api/health` shows `"db":"error"` | Atlas paused, Atlas outage, password changed, or network access changed | Atlas: **Resume** if paused (free clusters can be paused after a long time with no connections; no data is lost); check **Network Access** includes `0.0.0.0/0`; check the user/password match Vercel's `MONGODB_URI`; status page https://status.mongodb.com |
| Every API call gives 500, Vercel logs show `Invalid environment variables` | A variable is missing on Vercel, or was added for the wrong environment | Vercel → Settings → Environment Variables (**Production** ticked) → **Redeploy** |
| Writes fail with "space quota" / storage errors | Atlas M0 storage (512 MB) is full; very unlikely for one person | Download a backup; delete old data or create a new free cluster (section 13) |
| Can't log in: "Too many attempts" | 10 failed logins per 15 minutes (per network and per email) | Wait 15 minutes. `npm run reset-password` also lifts the email lock |
| Forgot password | — | **Forgot password?** on the login page. If email isn't working, see the next rows or use the [admin script](#reset-a-forgotten-password) |
| "Password reset by email is not set up on this site yet" | The `EMAIL_*`/`APP_URL` variables are missing on Vercel | Section 5a, then **Redeploy** |
| "We couldn't send the email right now" | The email service refused. **Vercel → Logs** shows its reply after `Email (brevo) refused: HTTP …` | **401**: wrong or deleted `EMAIL_API_KEY`, or Brevo's *Authorized IPs* is on (5a step 4). **400** mentioning the sender: `EMAIL_FROM` isn't a verified sender (5a step 2). **402/403**: account not activated yet, or daily limit reached; see the Brevo dashboard |
| "If an account exists…" but no email arrives | Wrong address, Spam folder, or delivery delay | Check **Spam/Promotions**; make sure it's the sign-up address; Brevo → **Transactional → Logs** shows whether it was delivered or bounced. Only the newest link works |
| The link in the email opens `localhost` or the wrong site | `APP_URL` on Vercel is wrong | Fix `APP_URL` → **Redeploy**, then ask for a new email |
| "This reset link is invalid, already used or expired" | The link is older than 30 minutes, was already used, or a newer email was requested | Ask for a new link and use the **newest** email |
| "Too many reset emails for this address" | 3 requests an hour per address (5 per network) stop inbox flooding | Wait an hour; meanwhile check Spam for the emails already sent |
| Logged out on every device at once | `JWT_SECRET` changed, or "Log out of all devices" was used | Log in again; nothing is lost |
| Login works, then you are immediately logged out (live only) | The cookie isn't kept: usually the site is opened over `http://` or in an embedded browser | Use the `https://` address in a normal browser |
| An **old version** keeps showing after a deploy | Browser or installed app still running the previous code | Close all tabs/the app and reopen; or `Ctrl+F5`. Last resort: `F12` → **Application** → **Storage** → **Clear site data** (logs you out, keeps your data online) |
| Red **Content Security Policy** errors in the console after you added an external script, font or API | The CSP in `vercel.json` only allows this site's own files | Prefer hosting the file in `client/public/`. Otherwise add its address to the matching directive (`script-src`, `font-src`, `connect-src` …) in `vercel.json` and update `docs/SECURITY_CHECKLIST.md` |
| "Install app" not offered | Already installed, a private window, iPhone outside Safari, or the manifest/service worker isn't loading | Check `npm run check:deploy` (manifest, icons and `sw.js` lines); `F12` → **Application → Manifest** lists problems |
| Vercel email: "usage limit reached" | Hobby plan limits (huge for one person, so unusual) | Vercel → **Usage** shows what grew. Look for a loop in the code making requests repeatedly |
| Push rejected: `Updates were rejected because the remote contains work…` | GitHub has commits your computer doesn't | `git pull`, then `git push` |
| Vercel build error `Found invalid Node.js Version` | Vercel no longer supports the Node version in `package.json` → `engines` | Section 13, "Node.js version" |

---

## Reset a forgotten password

**Normally:** the login page → **Forgot password?** → the emailed link (needs section 5a set up once).

**When email isn't available** (not set up, or the email account itself is lost), whoever has the database connection string (you) can set a new password from a computer:

```powershell
# Local database (uses server/.env)
npm run reset-password -- you@example.com

# Live site: use the PRODUCTION connection string, in this terminal only
$env:MONGODB_URI = "mongodb+srv://USER:PASSWORD@cluster…/?retryWrites=true&w=majority"
$env:MONGODB_DB_NAME = "finance-tracker"
npm run reset-password -- you@example.com
Remove-Item Env:MONGODB_URI, Env:MONGODB_DB_NAME
```

- It prints which database it connected to. **Check it's the right one** before typing a password.
- Type the new password twice (10–64 characters). It's visible while typing, so do it in private.
- It also **logs that account out everywhere** and lifts a "Too many attempts" lock.
- Copy the production connection string from Vercel → Settings → Environment Variables → `MONGODB_URI`. Never save it in a file inside the project.

---

## 10. Backups and restoring data

**The free Atlas cluster has no automatic backups.** Backups are your job:

- **Monthly** (calendar reminder): in the app, **Settings → Your data → Download backup (JSON)** and **Download all transactions (CSV)**. Store them outside your computer (Google Drive, OneDrive, a USB drive). They are private financial records.
- **Before risky changes** (deleting categories, big imports, dependency upgrades, moving hosts): take one first.

**Restoring:**

| What was lost | How to restore |
|---|---|
| Some transactions | **Transactions → Import CSV** with the CSV backup. Rows that still exist are flagged as duplicates and unticked, so only the missing ones are added |
| A whole account (new account, or a new database) | Create custom categories first (same names), then import the CSV. Re-create budgets (few, quick). Settings (currency, time zone, opening balance) are in the JSON file's `user` section |
| A bad import | Use **Undo this import** right after; later, delete the rows (filter Transactions by date) |
| The whole database | Atlas can't restore free clusters. Restore account by account from the backups, as above |

The JSON backup is a complete record (including budgets and category colours/icons). There's no "restore JSON" button yet. A developer can write a small script based on `server/scripts/reset-password.js` (connect, then insert the documents with new ids), or you restore via CSV as above.

---

## 11. Regular maintenance calendar

| When | Task | Time |
|---|---|---|
| **Monthly** | Download both backups (section 10) | 2 min |
| **Monthly** | Open the site once on phone and computer; `npm run check:deploy -- <url>` | 2 min |
| **Every 3 months** | `npm audit` (section 12); patch and minor updates; `npm test`; deploy | 30 min |
| **Every 6 months** | Look at Vercel **Usage** and Atlas **Metrics → storage**; read your provider emails | 10 min |
| **Yearly** | Is Node 24 still supported (section 13)? Rotate `JWT_SECRET` and the Atlas password (section 5); re-read *Accepted risks* in SECURITY_CHECKLIST.md | 30 min |
| **Any email** from Vercel, Atlas or GitHub about plan, security or deprecation | Read it. Free-tier changes are announced weeks ahead | — |

---

## 12. Updating dependencies safely

The project has very few dependencies on purpose (7 for the server, 5 for the website). Updates are still needed for security fixes.

### Routine (every 3 months)

```powershell
git pull
npm audit              # known vulnerabilities
npm outdated           # what has newer versions
npm update             # safe updates within the allowed ranges (^x.y.z: same major)
npm test
npm run build
npm audit
```

If everything passes, run the app locally and click through the main pages: Dashboard, add a transaction, Budgets, Reports, Import, Settings. Then commit (`git add . ; git commit -m "Update dependencies" ; git push`) and run `check:deploy`.

**`npm audit` says "fix available via `npm audit fix --force`"?** Don't use `--force` blindly: it can install new **major** versions that break code. Run `npm audit fix` (without force) first. If a problem remains, check whether it affects production at all: `npm audit --omit=dev` lists only what's deployed, and test tools such as vitest aren't deployed.

### Major versions (the first number changes, e.g. Express 5 → 6)

Do these **one at a time**, on a separate branch, reading the package's "migration guide" or "breaking changes" first:

```powershell
git checkout -b upgrade-express
npm install express@latest --workspace server
npm test
```

If it fails and the fix isn't clear, go back: `git checkout main` (then `git branch -D upgrade-express`) and stay on the old version. That's safe, as long as `npm audit` is clean.

| Package | Used for | When upgrading a major, check… |
|---|---|---|
| `express` | API routing | Route path syntax, error handling |
| `mongoose` | Database models and queries | Removed options; run all server tests |
| `zod` | Input validation | Error message format: the API's `details` must stay `[{ field, message }]` |
| `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `helmet` | Login and security | Rerun `server/tests/security.test.js` and `auth.test.js`; log in on the live site afterwards |
| `react`, `react-dom` | The website | Warnings in the browser console |
| `react-router` | Pages and URLs | Imports and how search params are read |
| `@tanstack/react-query` | Loading data | Option names (`keepPreviousData`, `onlineManager`) |
| `tailwindcss`, `@tailwindcss/vite` | Styling | Renamed classes; check light **and** dark mode and a phone width |
| `vite`, `@vitejs/plugin-react` | Build | `npm run build` and `npm run preview` |
| `vitest`, `supertest`, `mongodb-memory-server` | Tests only | Tests still start; not deployed, so low risk |

---

## 13. Future risks and what to do

| Risk | Signs | What to do |
|---|---|---|
| **Node.js version retired.** Node 24 LTS gets security fixes until about **April 2028** (see https://nodejs.org/en/about/previous-releases). Vercel stops building old versions some time after | Vercel email; build error about the Node version | Install the next **LTS** locally (an even number, e.g. 26), change `"engines": { "node": "26.x" }` in `package.json`, `npm install`, `npm test`, push |
| **Atlas pauses the free cluster** after a long time with no use | `/api/health` → `"db":"error"`; Atlas shows *Paused* | Atlas → cluster → **Resume** (data kept). Using the app regularly prevents it |
| **Atlas changes or removes the free tier** | Email from MongoDB | Create a cluster on the new free option (or another provider's MongoDB); copy data with `mongodump`/`mongorestore` (MongoDB Database Tools), or restore from backups (section 10); update `MONGODB_URI` on Vercel; redeploy |
| **Vercel changes the Hobby plan** | Email from Vercel | The Express app is ordinary Node. Fallback in ARCHITECTURE.md §1 and §3: website on Netlify or Cloudflare Pages, API on Render (`npm start` runs `server/src/server.js`). Same-origin matters for log-in cookies, so put the API behind the same domain with a rewrite |
| **Storage full** (512 MB) | Write errors; Atlas storage metric | Many years away for one person. Delete old rate-limit data (removed automatically) or old years after backing up |
| **A security hole is found in a dependency** | `npm audit`, GitHub "Dependabot" emails | Section 12. Prioritise `express`, `jsonwebtoken`, `mongoose`, `bcryptjs`, `helmet` |
| **Secret leaked** (screenshot, chat, commit) | — | Rotate it at once (section 5) |
| **Browser changes break something** | Odd layout or console errors on a new phone or browser | Reproduce locally with the same browser; check the console; most fixes are CSS |
| **Lost access to the email of your GitHub/Vercel/Atlas accounts** | — | Turn on two-factor authentication now and store the recovery codes in your password manager |
| **Losing your only copy of secrets** | — | Section 2: keep them in a password manager |

---

## 14. Common changes: which files to edit

| Change | Files |
|---|---|
| Add a **payment method** | `server/src/constants.js` (`PAYMENT_METHODS`) **and** `client/src/lib/constants.js` (with its label). Optionally teach the importer: `paymentMethodFrom` in `client/src/lib/csvImport.js` |
| Change the **default categories** for new accounts | `server/src/services/defaultCategories.js` (existing accounts are unchanged; update the "17 default categories" test and `scripts/check-deploy.mjs`) |
| **Budget warning** level (80%) | `server/src/services/budgets.service.js` (status: `spent × 5 ≥ limit × 4`), `client/src/features/budgets/BudgetMeter.jsx` and `BudgetsPage.jsx`, and their tests |
| **Import limits** (2,000 rows, 1 MB, 20 an hour) | `server/src/constants.js` (`MAX_IMPORT_ROWS`), `client/src/lib/csvImport.js` (`MAX_IMPORT_ROWS`, `MAX_FILE_BYTES`), the rate limit in `server/src/routes/transactions.routes.js`, and the 2 MB body limit in `server/src/app.js` |
| Teach the importer a new **bank column name** | `HEADER_PATTERNS` in `client/src/lib/csvImport.js`; add a test in `csvImport.test.js` with the bank's real header line |
| **Login limits** | `server/src/routes/auth.routes.js` (`rateLimit({ … max, windowMs })`) |
| **Colours / look** | Tailwind classes in the components; chart colours are CSS variables at the top of `client/src/index.css` (light and dark) |
| **What is printed** | `data-print="hide"` / `"only"` attributes on elements, and the `@media print` block in `client/src/index.css` |
| **Security headers / CSP** | `vercel.json` → `headers` (page); `helmet()` in `server/src/app.js` (API) |
| **App name, icon, shortcuts** (installed app) | `client/public/manifest.webmanifest`, `client/public/icons/`, `client/index.html` |
| The in-app **Quick guide** text | `client/src/features/guide/guideContent.js` (`GUIDE_STEPS`, `GUIDE_TIPS`), used by both the guide page and the Quick tour. Keep it in step with `docs/USER_GUIDE.md` |
| A new **page** | A component in `client/src/features/<name>/`, a `<Route>` in `client/src/App.jsx`, and a menu entry in `client/src/components/layout/navItems.js` |
| A new **API endpoint** | Validator (`server/src/validators/`), controller (`server/src/controllers/`), route (`server/src/routes/`), a test in `server/tests/`, and a function in `client/src/api/` |

After any change: `npm test`, `npm run build`, try it on a phone-sized window, then commit and push (section 4).

---

## 15. How the code fits together (short tour)

```
Browser (React)                      Vercel function (Express)                 MongoDB Atlas
client/src/features/…  ──fetch──▶  /api/…  route → validate (Zod) → controller ──▶ users, categories,
client/src/api/*.js     (cookie)    requireAuth sets req.userId                    transactions, budgets,
react-query caches      ◀──JSON──   every query includes { userId }                ratelimits
```

- **One origin:** the page and the API share one address, so the login cookie is first-party and no CORS is needed. Locally, Vite (5173) forwards `/api` to Express (4000).
- **Money** is whole paise everywhere (`amountMinor`), converted only when typed (`parseAmount`) or shown (`formatMoney`) in `client/src/lib/money.js`.
- **Dates** are `"YYYY-MM-DD"` text, never timestamps, so a transaction can't move to another day across time zones.
- **Errors:** the server throws `AppError(status, message, details)` and the error handler turns it into `{ error: { message, details } }`. Unexpected errors are logged on Vercel and shown to users as a generic message. The client's `api()` turns them into `ApiError` with `.status` and `.details`.
- **Security in one line each:**
  - bcrypt-hashed passwords
  - an HttpOnly session cookie
  - the same-origin check on changes
  - Zod on every input
  - `userId` in every query
  - rate limits stored in MongoDB
  - CSP headers on the page
  - API responses marked "never cache"
  - the service worker never stores `/api` responses

The full reasoning is in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 16. Getting help without Claude

1. **Read the whole error message**, especially the first line and any file path and line number (e.g. `ReportsPage.jsx:212`). It usually names the problem exactly.
2. **Check the tables in section 8.**
3. **Search the exact message** (in quotes) on the web; Stack Overflow and the package's GitHub *Issues* usually have it.
4. **Official documentation:**

   | Topic | Documentation |
   |---|---|
   | Express | https://expressjs.com |
   | Mongoose | https://mongoosejs.com/docs |
   | Zod | https://zod.dev |
   | React | https://react.dev |
   | React Router | https://reactrouter.com |
   | TanStack Query | https://tanstack.com/query |
   | Tailwind CSS | https://tailwindcss.com/docs |
   | Vite | https://vite.dev |
   | Vercel | https://vercel.com/docs |
   | MongoDB Atlas | https://www.mongodb.com/docs/atlas |

5. **Any AI assistant** can help if you give it context. Paste:
   - the exact error and the command you ran
   - the relevant file(s)
   - the related section of this document or ARCHITECTURE.md

   Ask it to explain before changing anything. Then run `npm test` before you push; the 251 tests catch most accidental breakage.
6. **Use Git as your undo button.**
   - Not committed yet: `git restore <file>` throws away changes to one file.
   - Last commit (already pushed): `git revert HEAD`, then push.
   - Live site: Vercel's **Instant Rollback** is always available.
