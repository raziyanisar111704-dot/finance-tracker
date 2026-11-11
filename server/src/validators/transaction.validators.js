import { z } from 'zod';
import { MAX_IMPORT_ROWS, PAYMENT_METHODS, TRANSACTION_TYPES } from '../constants.js';
import {
  amountMinor,
  dateRangeIsOrdered,
  dateString,
  hasAtLeastOneField,
  objectId,
} from './common.js';

const type = z.enum(TRANSACTION_TYPES, { error: 'Type must be income or expense.' });
const paymentMethod = z.enum(PAYMENT_METHODS, { error: 'Choose a valid payment method.' });
const notes = z
  .string({ error: 'Notes must be text.' })
  .trim()
  .max(500, 'Notes must be at most 500 characters.');

const fields = {
  type,
  amountMinor,
  categoryId: objectId('category'),
  date: dateString,
  paymentMethod,
  notes,
  isRecurring: z.boolean({ error: 'Recurring must be true or false.' }),
};

export const createTransactionSchema = z.object({
  ...fields,
  paymentMethod: paymentMethod.optional(),
  notes: notes.optional(),
  isRecurring: fields.isRecurring.optional(),
});

export const updateTransactionSchema = z.object(fields).partial().refine(...hasAtLeastOneField);

export const listTransactionsQuery = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
    type: type.optional(),
    categoryId: objectId('category').optional(),
    paymentMethod: paymentMethod.optional(),
    q: z.string().trim().max(100, 'Search text is too long.').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(...dateRangeIsOrdered);

// ---- CSV import ----

const importRows = (row) =>
  z
    .array(row, { error: 'Send the rows as a list.' })
    .min(1, 'There is nothing to import.')
    .max(MAX_IMPORT_ROWS, `Import at most ${MAX_IMPORT_ROWS} rows at a time. Split the file into smaller parts.`);

// The same rules as adding one transaction by hand.
export const importTransactionsSchema = z.object({
  rows: importRows(createTransactionSchema.omit({ isRecurring: true })),
});

// "Is this row already in my account?" needs only date, type and amount.
export const checkDuplicatesSchema = z.object({
  rows: importRows(z.object({ type, amountMinor, date: dateString })),
});

export const importIdParams = z.object({
  importId: z.string().uuid('Invalid import id.'),
});
