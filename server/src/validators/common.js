import { z } from 'zod';
import { MAX_AMOUNT_MINOR } from '../constants.js';
import { isValidDateString } from '../utils/dates.js';

// "Email is required." when missing, "Email must be text." for wrong types.
export const text = (label) =>
  z.string({
    error: (issue) => (issue.input === undefined ? `${label} is required.` : `${label} must be text.`),
  });

// MongoDB ObjectId: 24 hexadecimal characters.
export const objectId = (label = 'id') =>
  z.string({ error: `Invalid ${label}.` }).regex(/^[a-f\d]{24}$/i, `Invalid ${label}.`);

export const idParams = z.object({ id: objectId() });

export const dateString = text('Date').refine(
  (value) => isValidDateString(value) && value >= '1970-01-01' && value <= '2100-12-31',
  'Enter a real date in YYYY-MM-DD format.',
);

// Money arrives from the client already converted to whole paise.
export const amountMinor = z
  .number({ error: 'Amount must be a number.' })
  .int('Amount must be in whole paise.')
  .min(1, 'Amount must be greater than zero.')
  .max(MAX_AMOUNT_MINOR, 'Amount is too large.');

// Query-string booleans arrive as the text "true" / "false".
export const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const hasAtLeastOneField = [
  (changes) => Object.keys(changes).length > 0,
  'Nothing to update.',
];
