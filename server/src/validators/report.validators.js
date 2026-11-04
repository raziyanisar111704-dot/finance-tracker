import { z } from 'zod';
import { monthsBetween } from '../utils/dates.js';
import { dateRangeIsOrdered, dateString, monthString } from './common.js';

const MAX_REPORT_MONTHS = 120;

export const monthSummaryQuery = z.object({
  month: monthString.optional(),
});

export const trendQuery = z.object({
  months: z.coerce
    .number()
    .int()
    .min(1, 'Choose at least 1 month.')
    .max(24, 'Choose at most 24 months.')
    .default(6),
  end: monthString.optional(),
});

export const reportQuery = z
  .object({ from: dateString, to: dateString })
  .refine(...dateRangeIsOrdered)
  .refine(
    ({ from, to }) => from > to || monthsBetween(from.slice(0, 7), to.slice(0, 7)).length <= MAX_REPORT_MONTHS,
    { message: 'Reports can cover at most 10 years.', path: ['to'] },
  );

export const exportQuery = z
  .object({ from: dateString.optional(), to: dateString.optional() })
  .refine(...dateRangeIsOrdered);
