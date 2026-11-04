import { z } from 'zod';
import { TRANSACTION_TYPES } from '../constants.js';
import { booleanQuery, hasAtLeastOneField, objectId, text } from './common.js';

const name = text('Name')
  .trim()
  .min(1, 'Name is required.')
  .max(40, 'Name must be at most 40 characters.');
const type = z.enum(TRANSACTION_TYPES, { error: 'Type must be income or expense.' });
const color = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, 'Color must be a hex value like #16a34a.');
const icon = z.string().trim().min(1).max(30);

export const listCategoriesQuery = z.object({
  type: type.optional(),
  includeArchived: booleanQuery.optional(),
});

export const createCategorySchema = z
  .object({
    name,
    type,
    isSavings: z.boolean().optional(),
    color: color.optional(),
    icon: icon.optional(),
  })
  .refine((c) => !(c.isSavings && c.type === 'income'), {
    message: 'Only expense categories can be marked as savings.',
    path: ['isSavings'],
  });

// `type` is deliberately not editable (see controller).
export const updateCategorySchema = z
  .object({
    name: name.optional(),
    isSavings: z.boolean().optional(),
    color: color.optional(),
    icon: icon.optional(),
    archived: z.boolean().optional(),
  })
  .refine(...hasAtLeastOneField);

export const deleteCategoryQuery = z.object({
  moveTo: objectId('category').optional(),
});
