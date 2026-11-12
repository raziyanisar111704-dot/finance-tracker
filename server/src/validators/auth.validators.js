import { z } from 'zod';
import { MAX_AMOUNT_MINOR } from '../constants.js';
import { isValidTimeZone } from '../utils/dates.js';
import { hasAtLeastOneField, text } from './common.js';

const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

const email = text('Email')
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long.')
  .pipe(z.email('Enter a valid email address.'));

// bcrypt only uses the first 72 bytes of a password, so we cap the length.
// Characters outside English take 2–4 bytes each (हिंदी, emoji), so 64
// characters alone could still pass 72 bytes and silently ignore the end.
const newPassword = text('Password')
  .min(10, 'Password must be at least 10 characters.')
  .max(64, 'Password must be at most 64 characters.')
  .refine(
    (password) => new TextEncoder().encode(password).length <= 72,
    'Password is too long. Use fewer non-English characters or emoji.',
  );

const name = text('Name')
  .trim()
  .min(1, 'Name is required.')
  .max(60, 'Name must be at most 60 characters.');

export const registerSchema = z.object({ name, email, password: newPassword });

export const loginSchema = z.object({
  email,
  password: text('Password').min(1, 'Password is required.').max(200),
});

export const updateMeSchema = z
  .object({
    name: name.optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .refine((code) => SUPPORTED_CURRENCIES.has(code), 'Unsupported currency code.')
      .optional(),
    timezone: z.string().trim().refine(isValidTimeZone, 'Unknown time zone.').optional(),
    openingBalanceMinor: z
      .number({ error: 'Opening balance must be a number.' })
      .int('Opening balance must be a whole number of paise.')
      .min(-MAX_AMOUNT_MINOR)
      .max(MAX_AMOUNT_MINOR)
      .optional(),
  })
  .refine(...hasAtLeastOneField);

export const deleteMeSchema = z.object({
  password: text('Password').min(1, 'Password is required.'),
});

export const forgotPasswordSchema = z.object({ email });

// The token from the emailed link: 32 random bytes in base64url = 43 characters.
export const resetPasswordSchema = z.object({
  token: z
    .string({ error: 'This reset link is invalid. Ask for a new one.' })
    .regex(/^[A-Za-z0-9_-]{43}$/, 'This reset link is invalid. Ask for a new one.'),
  password: newPassword,
});
