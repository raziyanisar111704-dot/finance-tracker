// Sends email through an HTTP email service, using Node's built-in fetch
// (no extra package). Chosen with EMAIL_PROVIDER:
//   brevo   — https://www.brevo.com  free plan, can send from a verified single
//             address (e.g. your Gmail) without owning a domain
//   resend  — https://resend.com     free plan, needs your own verified domain
//             to send to anyone other than yourself
//   console — prints the email in the terminal (local development)
//   memory  — keeps emails in `sentEmails` (automated tests)
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const sentEmails = []; // memory provider only

export const emailIsConfigured = () => Boolean(env.EMAIL_PROVIDER && env.APP_URL);

// "Finance Tracker <me@x.com>" → { name: 'Finance Tracker', email: 'me@x.com' }
function parseFrom(from) {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  return match ? { name: match[1] || undefined, email: match[2] } : { email: from.trim() };
}

const providers = {
  async brevo({ to, subject, text, html }) {
    return fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.EMAIL_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: parseFrom(env.EMAIL_FROM), to: [{ email: to }], subject, textContent: text, htmlContent: html }),
      signal: AbortSignal.timeout(10_000),
    });
  },
  async resend({ to, subject, text, html }) {
    return fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.EMAIL_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(10_000),
    });
  },
};

// message: { to, subject, text, html }. Throws a 503 AppError if sending
// fails; the provider's reply goes to the server log (Vercel → Logs), never
// to the user.
export async function sendEmail(message) {
  if (!emailIsConfigured()) {
    throw new AppError(503, 'Password reset by email is not set up on this site yet.');
  }
  if (env.EMAIL_PROVIDER === 'memory') {
    sentEmails.push(message);
    return;
  }
  if (env.EMAIL_PROVIDER === 'console') {
    console.log(`\n----- EMAIL to ${message.to} -----\nSubject: ${message.subject}\n\n${message.text}\n----- end of email -----\n`);
    return;
  }

  let res;
  try {
    res = await providers[env.EMAIL_PROVIDER](message);
  } catch (err) {
    console.error(`Email (${env.EMAIL_PROVIDER}) could not be sent:`, err.message);
    throw new AppError(503, "We couldn't send the email right now. Please try again in a few minutes.");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Email (${env.EMAIL_PROVIDER}) refused: HTTP ${res.status} ${body.slice(0, 500)}`);
    throw new AppError(503, "We couldn't send the email right now. Please try again in a few minutes.");
  }
}

// ---- Messages ---------------------------------------------------------------

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout(paragraphs, button) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`).join('');
  const link = button
    ? `<p style="margin:0 0 24px"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${escapeHtml(button.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:#475569">If the button doesn't work, copy this address into your browser:<br><span style="word-break:break-all">${escapeHtml(button.url)}</span></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
<div style="max-width:520px;margin:0 auto;padding:32px 24px"><p style="margin:0 0 24px;font-weight:700;color:#0f766e">Finance Tracker</p>${body}${link}</div></body></html>`;
}

export function passwordResetEmail({ to, name, url, minutes }) {
  const lines = [
    `Hi ${name},`,
    `Someone (hopefully you) asked to reset the password for your Finance Tracker account. The link below works once, for the next ${minutes} minutes.`,
  ];
  const ignore = "If you didn't ask for this, you can ignore this email: your password stays the same and nobody can use this link without access to your inbox.";
  return {
    to,
    subject: 'Reset your Finance Tracker password',
    text: `${lines.join('\n\n')}\n\nChoose a new password:\n${url}\n\n${ignore}\n`,
    html: layout(lines, { url, label: 'Choose a new password' }).replace('</div></body>', `<p style="margin:0;font-size:13px;color:#475569">${escapeHtml(ignore)}</p></div></body>`),
  };
}

export function passwordChangedEmail({ to, name, url }) {
  const lines = [
    `Hi ${name},`,
    'The password for your Finance Tracker account was just changed, and every device was logged out.',
    "If this wasn't you, reset your password now with the link below and check that your email account is secure.",
  ];
  return {
    to,
    subject: 'Your Finance Tracker password was changed',
    text: `${lines.join('\n\n')}\n\n${url}\n`,
    html: layout(lines, { url, label: 'Reset password' }),
  };
}
