import { model, Schema } from 'mongoose';
import { DATE_PATTERN, MAX_AMOUNT_MINOR, PAYMENT_METHODS, TRANSACTION_TYPES } from '../constants.js';
import { toJSONOptions } from '../utils/toJSON.js';

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    // Always positive; `type` decides whether it adds or subtracts.
    amountMinor: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_AMOUNT_MINOR,
      validate: { validator: Number.isSafeInteger, message: 'must be a whole number' },
    },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    // Calendar date "YYYY-MM-DD", never shifted by time zones.
    date: { type: String, required: true, match: DATE_PATTERN },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'other' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    isRecurring: { type: Boolean, default: false },
    // Set on rows added by a CSV import, so "Undo this import" removes exactly them.
    importId: { type: String, default: undefined },
  },
  { timestamps: true, toJSON: toJSONOptions(['userId']) },
);

// Newest-first lists and date-range reports for one user.
transactionSchema.index({ userId: 1, date: -1, createdAt: -1 });
// Category totals and budget calculations.
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });

// Undo of one import.
transactionSchema.index(
  { userId: 1, importId: 1 },
  { partialFilterExpression: { importId: { $exists: true } } },
);

export const Transaction = model('Transaction', transactionSchema);
