# Testing & security checklist

Run `npm test` and `npm audit` from the project root before every deploy.
Everything marked **auto** is covered by those tests; **manual** items are
checked by hand on the live site (see the end of this file).

## Money and calculations

| Check | How |
|---|---|
| Amounts are whole paise end to end; no floating point | auto: `client/src/lib/money.test.js`, `server/tests/utils.test.js` |
| Typed amounts: `0.29` → 29 paise, `1,23,456.78` accepted, `12,5` rejected, max ₹1,00,00,00,00,000 | auto: `money.test.js` |
| Month totals, savings rate, previous-month change, balance with opening balance | auto: `server/tests/summary.test.js` (hand-calculated sample data) |
| Dashboard, budgets and transaction list agree on the same figures | auto: `summary.test.js`, `budgets.test.js` |
| Budget warning from exactly 80%, "over" only above 100%; displayed % never contradicts it | auto: `utils.test.js`, `BudgetMeter.test.js` |
| Month ends, leap years, "today" in the user's time zone | auto: `dates.test.js`, `utils.test.js` |

## Accounts and sessions

| Check | How |
|---|---|
| Passwords stored only as bcrypt hashes (cost 12); never returned by any endpoint | auto: `auth.test.js`, `export.test.js` |
| New passwords 10–64 characters and at most 72 bytes (bcrypt's limit) | auto: `security.test.js` |
| Same error for unknown email and wrong password | auto: `auth.test.js` |
| Same response time for unknown emails (a dummy hash is checked) | code review: `server/src/utils/password.js` |
| Session cookie is HttpOnly, SameSite=Lax, Secure in production | auto: `auth.test.js`, `security.test.js`; **manual** for Secure |
| Forged, expired, unsigned and other-secret tokens rejected | auto: `security.test.js` |
| "Log out of all devices" and account deletion end every old session | auto: `auth.test.js`, `security.test.js` |
| Rate limits: login (per IP and per email), sign-up, delete account | auto: `auth.test.js`, `security.test.js` |

## Privacy between users (IDOR)

| Check | How |
|---|---|
| Another user's transactions, categories and budgets return 404, can't be changed or deleted | auto: `transactions.test.js`, `categories.test.js`, `budgets.test.js` |
| Can't attach data to someone else's category, or move transactions into it | auto: `transactions.test.js`, `security.test.js` |
| Summaries, trends, reports, budget copy and exports contain only your own data | auto: `summary.test.js`, `export.test.js`, `security.test.js` |
| A `userId` (or `tokenVersion`, `passwordHash`, `email`) sent in a request body is ignored | auto: `security.test.js`, `auth.test.js` |
| CSV import: only your own categories; can't undo someone else's import; duplicate check sees only your data; a `userId`/`importId` in the rows is ignored | auto: `import.test.js` |

## Attacks on input and the browser

| Check | How |
|---|---|
| NoSQL injection (`{"$gt": ""}`, `?categoryId[$ne]=…`) can't reach the database | auto: `auth.test.js`, `security.test.js` |
| Search text is matched literally, never as a pattern | auto: `transactions.test.js` |
| Requests from other websites (CSRF) refused for every change | auto: `auth.test.js`, `security.test.js` |
| CSV export can't run spreadsheet formulas (`=HYPERLINK(…)` is neutralised) | auto: `utils.test.js`, `export.test.js` |
| CSV import is all or nothing, uses the same rules as adding by hand, max 2,000 rows / 2 MB, 20 imports per hour per user | auto: `import.test.js` |
| The imported file is read in the browser; only the ticked rows are sent. Notes are stored as plain text and shown escaped by React | `csvImport.test.js`, browser check (Phase 7.2) |
| Errors never reveal internal details; broken / oversized bodies get clear 400 / 413 | auto: `security.test.js` |
| API responses are never cached (`Cache-Control: no-store`) | auto: `security.test.js` |
| The service worker (installed app) stores only the app's own files, never `/api` responses, so no financial data stays on the device | `client/public/sw.js` skips `/api/`; browser check (Phase 7.1), also after log out |
| Page has a Content Security Policy (only this site's scripts) and can't be framed | browser check against the production build; **manual** on the live site |
| No `dangerouslySetInnerHTML` / `eval` in the client; React escapes all user text | code review |
| Dependencies have no known vulnerabilities | `npm audit` (0 found on 11 Nov 2026) |

## Responsive and accessible

| Check | How |
|---|---|
| Every page at 320, 375, 768, 1024 and 1440 px: no sideways scrolling, nothing cut off | browser sweep (Phase 5) |
| Every control at least 24×24 px (WCAG 2.2 AA); chart columns have a full-size equivalent in Table view | browser sweep |
| Dialogs fit a 320 px screen with their Save button visible | browser sweep |
| Light and dark mode; colours never the only signal (icons + words) | screenshots, colour-blind palette check (Step 4.3) |

## Manual checks on the live site (after each deploy)

1. Open the site, press `F12` → **Network**, reload, click the first request (the page). Under **Response Headers** you should see `content-security-policy`, `x-frame-options: DENY` and `x-content-type-options: nosniff`.
2. Press `F12` → **Console**: no red "Content Security Policy" errors while you use the app.
3. Press `F12` → **Application** → **Cookies**: `ft_session` shows ✓ HttpOnly, ✓ Secure, SameSite Lax.
4. Vercel → Settings → Environment Variables: `JWT_SECRET` is set (long and random, different from your local one) and there is **no** `DNS_SERVERS`.
5. Atlas → Database Access: the app's user has `readWrite` on only the app database.

## Accepted risks

- **Atlas network access is open to `0.0.0.0/0`**, because Vercel's IP addresses change. Protection relies on the strong database password and TLS.
- **Sign-up reveals whether an email is registered** ("An account with this email already exists"). It's limited to 5 tries per hour per address, and hiding it would need email verification (V2).
- **The per-email login limit** lets someone who knows your email block logins to it for up to 15 minutes. It's what stops slow password guessing from many computers.
- **There's no password reset or email change yet** (planned for V2). Write your password down in a password manager.
