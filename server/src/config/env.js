import { z } from 'zod';

// Every environment variable the server needs is declared and validated here,
// once, at startup. The rest of the code imports `env` instead of reading
// process.env directly, so a typo or missing value fails fast with a clear message.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  MONGODB_DB_NAME: z.string().min(1).default('finance-tracker'),
  // Signs login tokens. Long and random; different for local and production.
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters long'),
  // Optional, local development only: comma-separated DNS servers for Node to
  // use, e.g. "8.8.8.8,1.1.1.1". Needed when Node can't resolve mongodb+srv
  // addresses (error: querySrv ECONNREFUSED). Leave unset on Vercel.
  DNS_SERVERS: z
    .string()
    .optional()
    .transform((value) => value?.split(',').map((s) => s.trim()).filter(Boolean)),

  // ---- Password reset by email ----
  // The site's public address, used to build the link in the email. Never
  // taken from the request: a forged Host header could otherwise make the
  // email point to an attacker's site.
  APP_URL: optional(z.url({ protocol: /^https?$/, error: 'must be a web address like https://your-app.vercel.app' }))
    .transform((value) => value?.replace(/\/+$/, '')),
  // brevo | resend: real email services (need EMAIL_API_KEY and EMAIL_FROM).
  // console: prints the email in the terminal (local development only).
  EMAIL_PROVIDER: optional(z.enum(['brevo', 'resend', 'console', 'memory'])),
  EMAIL_API_KEY: optional(z.string()),
  // "Finance Tracker <you@example.com>": the sender address must be verified
  // with the email service.
  EMAIL_FROM: optional(
    z.string().regex(/^(.+<)?[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>?$/, 'must look like Finance Tracker <you@example.com>'),
  ),
});

// An empty value in .env ("EMAIL_API_KEY=") counts as not set.
function optional(schema) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

const withDefaults = (raw) => {
  const nodeEnv = raw.NODE_ENV ?? 'development';
  return {
    ...raw,
    // Locally the reset email is printed in the terminal; tests keep it in memory.
    EMAIL_PROVIDER: raw.EMAIL_PROVIDER || { development: 'console', test: 'memory' }[nodeEnv],
    APP_URL: raw.APP_URL || (nodeEnv === 'production' ? undefined : 'http://localhost:5173'),
  };
};

const parsed = envSchema
  .superRefine((value, ctx) => {
    if (['brevo', 'resend'].includes(value.EMAIL_PROVIDER)) {
      for (const key of ['EMAIL_API_KEY', 'EMAIL_FROM', 'APP_URL']) {
        if (!value[key]) ctx.addIssue({ code: 'custom', path: [key], message: `is required when EMAIL_PROVIDER=${value.EMAIL_PROVIDER}` });
      }
    }
    // Printed reset links would end up in the hosting logs.
    if (value.NODE_ENV === 'production' && ['console', 'memory'].includes(value.EMAIL_PROVIDER)) {
      ctx.addIssue({ code: 'custom', path: ['EMAIL_PROVIDER'], message: 'console/memory are for development only; use brevo or resend' });
    }
  })
  .safeParse(withDefaults(process.env));

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(
    `\nInvalid environment variables:\n${problems}\n\n` +
      'Copy server/.env.example to server/.env and fill in the values.\n',
  );
  throw new Error('Invalid environment variables');
}

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
});
