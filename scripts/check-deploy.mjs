// Checks a deployed copy of the app from the outside, like a visitor would.
//
//   npm run check:deploy -- https://your-app.vercel.app
//   npm run check:deploy -- https://your-app.vercel.app --with-account
//
// Without --with-account it only reads (health check, headers, pages).
// With it, it also signs up a throwaway account (deploy-check-…@example.com),
// adds one transaction, reads it back, imports and undoes one row, and then
// DELETES the account again, to
// prove that log-in, cookies and the database work in production.

const args = process.argv.slice(2);
const withAccount = args.includes('--with-account');
const base = args.find((arg) => /^https?:\/\//.test(arg))?.replace(/\/+$/, '');

if (!base) {
  console.error('Usage: npm run check:deploy -- https://your-app.vercel.app [--with-account]');
  process.exit(2);
}

const origin = new URL(base).origin;
const isLocal = ['localhost', '127.0.0.1'].includes(new URL(base).hostname);
let failures = 0;

function report(status, name, detail = '') {
  if (status === 'FAIL') failures += 1;
  console.log(`${status.padEnd(4)}  ${name}${detail ? `  (${detail})` : ''}`);
}
const check = (ok, name, detail) => report(ok ? 'PASS' : 'FAIL', name, ok ? '' : detail);

async function get(path, options = {}) {
  return fetch(`${base}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(20_000), ...options });
}

// Requests the app's own pages would make: same Origin, JSON body.
function apiCall(path, { method = 'GET', body, cookie } = {}) {
  const headers = { Origin: origin };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  return get(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function readOnlyChecks() {
  console.log(`\nChecking ${base}\n`);

  if (!isLocal) {
    const http = await fetch(base.replace(/^https:/, 'http:'), { redirect: 'manual' }).catch(() => null);
    check(http && [301, 302, 307, 308].includes(http.status) && http.headers.get('location')?.startsWith('https://'),
      'Plain http:// redirects to https://', http ? `status ${http.status}` : 'no response');
  }

  const started = Date.now();
  const health = await get('/api/health');
  const healthBody = await health.json().catch(() => null);
  check(health.status === 200 && healthBody?.db === 'ok', 'API is up and reaches MongoDB Atlas',
    `status ${health.status}, body ${JSON.stringify(healthBody)}`);
  if (healthBody?.db === 'ok') {
    console.log(`      response ${Date.now() - started} ms, database ping ${healthBody.dbLatencyMs} ms`);
  }

  const page = await get('/');
  const html = await page.text();
  const h = (name) => page.headers.get(name) ?? '';
  check(page.status === 200 && html.includes('<div id="root">'), 'Home page loads', `status ${page.status}`);
  check(h('content-security-policy').includes("script-src 'self'") && h('content-security-policy').includes("frame-ancestors 'none'"),
    'Content Security Policy is sent', h('content-security-policy') || 'missing');
  check(h('x-frame-options') === 'DENY', 'Page cannot be shown inside another site (X-Frame-Options)', h('x-frame-options') || 'missing');
  check(h('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff', h('x-content-type-options') || 'missing');
  if (!isLocal) {
    check(h('strict-transport-security').includes('max-age'), 'HTTPS is enforced for future visits (HSTS)', 'missing');
  }

  const deep = await get('/budgets');
  check(deep.status === 200 && (await deep.text()).includes('<div id="root">'),
    'Opening /budgets directly works (no 404 on refresh)', `status ${deep.status}`);

  const theme = await get('/theme.js');
  check(theme.status === 200 && (theme.headers.get('content-type') ?? '').includes('javascript'),
    'theme.js is served as a script, not as the page', `${theme.status} ${theme.headers.get('content-type')}`);

  // Installable app (PWA)
  const manifestRes = await get('/manifest.webmanifest');
  const manifest = await manifestRes.json().catch(() => null);
  check(manifestRes.status === 200 && manifest?.name === 'Finance Tracker' && manifest?.display === 'standalone',
    'App manifest is served', `status ${manifestRes.status}`);
  for (const icon of manifest?.icons ?? []) {
    const res = await get(icon.src);
    check(res.status === 200 && res.headers.get('content-type') === 'image/png', `Icon ${icon.src} downloads`, `status ${res.status}`);
  }
  const sw = await get('/sw.js');
  const swCache = sw.headers.get('cache-control') ?? '';
  check(sw.status === 200 && (sw.headers.get('content-type') ?? '').includes('javascript') && swCache.includes('no-cache'),
    'Service worker is served and never cached (updates reach phones)', `${sw.status} ${sw.headers.get('content-type')} cache-control=${swCache}`);

  const script = /<script[^>]+src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1];
  if (script) {
    const asset = await get(script);
    check(asset.status === 200, 'App code downloads', `status ${asset.status}`);
    check((asset.headers.get('cache-control') ?? '').includes('immutable'),
      'App code is cached by browsers (faster repeat visits)', asset.headers.get('cache-control') ?? 'no cache header');
  } else {
    check(false, 'App code is linked from the page', 'no /assets/*.js script tag found');
  }

  const me = await get('/api/auth/me');
  check(me.status === 401 && (me.headers.get('cache-control') ?? '') === 'no-store',
    'API refuses data without a log-in and is never cached', `${me.status} cache-control=${me.headers.get('cache-control')}`);

  const missing = await get('/api/does-not-exist');
  const missingBody = await missing.json().catch(() => null);
  check(missing.status === 404 && missingBody?.error, 'Unknown API routes answer with a JSON 404', `status ${missing.status}`);

  const csrf = await get('/api/auth/login', {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com', password: 'x' }),
  });
  check(csrf.status === 403, 'Requests from other websites are refused (CSRF)', `status ${csrf.status}`);
}

async function accountChecks() {
  console.log('\nThrowaway account (created, used, then deleted)\n');
  const email = `deploy-check-${Date.now()}@example.com`;
  const password = `Check-${crypto.randomUUID()}`;
  let cookie = null;

  try {
    const register = await apiCall('/api/auth/register', {
      method: 'POST',
      body: { name: 'Deploy Check', email, password },
    });
    const setCookie = register.headers.get('set-cookie') ?? '';
    check(register.status === 201, 'Sign-up works (database writes, same-origin check passes)',
      `status ${register.status}: ${(await register.clone().text()).slice(0, 200)}`);
    if (register.status !== 201) return;

    cookie = setCookie.split(';')[0];
    check(/HttpOnly/i.test(setCookie), 'Session cookie is HttpOnly', setCookie);
    check(/SameSite=Lax/i.test(setCookie), 'Session cookie is SameSite=Lax', setCookie);
    check(/;\s*Secure/i.test(setCookie), 'Session cookie is Secure (server runs in production mode)', setCookie);

    const me = await apiCall('/api/auth/me', { cookie });
    check(me.status === 200, 'The session cookie logs you in', `status ${me.status}`);

    const categories = (await (await apiCall('/api/categories', { cookie })).json()).categories ?? [];
    const salary = categories.find((c) => c.name === 'Salary');
    check(categories.length === 17 && salary, 'New account gets the 17 default categories', `${categories.length} categories`);

    const tx = await apiCall('/api/transactions', {
      method: 'POST',
      cookie,
      body: { type: 'income', amountMinor: 123456, categoryId: salary?.id, date: '2026-01-15', notes: 'deploy check' },
    });
    check(tx.status === 201, 'Adding a transaction works', `status ${tx.status}`);

    const january = await (await apiCall('/api/reports?from=2026-01-01&to=2026-01-31', { cookie })).json();
    check(january.totals?.incomeMinor === 123456, 'Reports read it back exactly (₹1,234.56)', JSON.stringify(january.totals));

    const csv = await apiCall('/api/export/transactions.csv', { cookie });
    check(csv.status === 200 && (await csv.text()).includes('1234.56'), 'CSV export works', `status ${csv.status}`);

    // CSV import: the duplicate check finds the transaction above, then one
    // row is imported and undone again.
    const dup = await apiCall('/api/transactions/import/check', {
      method: 'POST',
      cookie,
      body: { rows: [{ type: 'income', amountMinor: 123456, date: '2026-01-15' }] },
    });
    check(dup.status === 200 && (await dup.json()).duplicates?.[0] === 0, 'Import: duplicate check finds the existing transaction', `status ${dup.status}`);
    const imported = await apiCall('/api/transactions/import', {
      method: 'POST',
      cookie,
      body: { rows: [{ type: 'income', amountMinor: 100, categoryId: salary?.id, date: '2026-01-16', notes: 'deploy check import' }] },
    });
    const importBody = await imported.json().catch(() => null);
    check(imported.status === 201 && importBody?.count === 1, 'Import: a row is imported', `status ${imported.status}`);
    if (importBody?.importId) {
      const undo = await apiCall(`/api/transactions/import/${importBody.importId}`, { method: 'DELETE', cookie });
      check(undo.status === 200, 'Import: undo removes it again', `status ${undo.status}`);
    }
  } finally {
    if (cookie) {
      const removed = await apiCall('/api/auth/me', { method: 'DELETE', cookie, body: { password } });
      check(removed.status === 204, 'Throwaway account deleted again', `status ${removed.status} — delete ${email} by logging in with it`);
      const after = await apiCall('/api/auth/me', { cookie });
      check(after.status === 401, 'Its session no longer works', `status ${after.status}`);
    }
  }
}

try {
  await readOnlyChecks();
  if (withAccount) await accountChecks();
  else console.log('\n(Add --with-account to also test sign-up, log-in and the database end to end.)');
} catch (err) {
  report('FAIL', 'Checks ran to the end', err.cause?.code ?? err.message);
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
