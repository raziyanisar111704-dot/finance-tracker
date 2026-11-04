import { model, Schema } from 'mongoose';
import { TRANSACTION_TYPES } from '../constants.js';
import { toJSONOptions } from '../utils/toJSON.js';

const categorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    // Savings/Investments: money moved here counts as "saved", not "spent".
    isSavings: { type: Boolean, default: false },
    color: { type: String, default: '#64748b', match: /^#[0-9a-f]{6}$/i },
    icon: { type: String, default: 'tag', maxlength: 30 },
    // Archived categories are hidden from forms but kept for history.
    archived: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: toJSONOptions(['userId']) },
);

// One "Groceries" expense category per user; "groceries" counts as the same
// name because of the case-insensitive collation (strength 2).
categorySchema.index(
  { userId: 1, type: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

export const Category = model('Category', categorySchema);
