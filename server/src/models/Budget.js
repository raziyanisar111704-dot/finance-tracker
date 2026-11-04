import { model, Schema } from 'mongoose';
import { MAX_AMOUNT_MINOR, MONTH_PATTERN } from '../constants.js';
import { toJSONOptions } from '../utils/toJSON.js';

const budgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    month: { type: String, required: true, match: MONTH_PATTERN },
    limitMinor: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_AMOUNT_MINOR,
      validate: { validator: Number.isSafeInteger, message: 'must be a whole number' },
    },
  },
  { timestamps: true, toJSON: toJSONOptions(['userId']) },
);

// At most one budget per category per month.
budgetSchema.index({ userId: 1, month: 1, categoryId: 1 }, { unique: true });

export const Budget = model('Budget', budgetSchema);
