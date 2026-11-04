import { z } from 'zod';
import { amountMinor, monthString, objectId } from './common.js';

export const listBudgetsQuery = z.object({
  month: monthString.optional(),
});

export const upsertBudgetSchema = z.object({
  month: monthString,
  categoryId: objectId('category'),
  limitMinor: amountMinor,
});

export const copyBudgetsSchema = z
  .object({
    fromMonth: monthString,
    toMonth: monthString,
    // false: keep budgets that already exist in the target month.
    overwrite: z.boolean().default(false),
  })
  .refine((body) => body.fromMonth !== body.toMonth, {
    message: 'Choose two different months.',
    path: ['toMonth'],
  });
