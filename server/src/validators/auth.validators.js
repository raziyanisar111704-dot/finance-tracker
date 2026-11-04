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
const newPassword = text('Password')
  .min(10, 'Password must be at least 10 characters.')
  .max(64, 'Password must be at most 64 characters.');

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
