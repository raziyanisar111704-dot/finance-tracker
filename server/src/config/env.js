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
  // Optional, local development only: comma-separated DNS servers for Node to
  // use, e.g. "8.8.8.8,1.1.1.1". Needed when Node can't resolve mongodb+srv
  // addresses (error: querySrv ECONNREFUSED). Leave unset on Vercel.
  DNS_SERVERS: z
    .string()
    .optional()
    .transform((value) => value?.split(',').map((s) => s.trim()).filter(Boolean)),
});

const parsed = envSchema.safeParse(process.env);

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
