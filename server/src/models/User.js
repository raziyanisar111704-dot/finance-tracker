import { model, Schema } from 'mongoose';
import { MAX_AMOUNT_MINOR } from '../constants.js';
import { toJSONOptions } from '../utils/toJSON.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // `select: false` means queries never return these unless asked explicitly.
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
    // Password reset by email: only a SHA-256 hash of the emailed token is
    // stored, so a database leak can't be used to reset passwords.
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
    currency: { type: String, default: 'INR', uppercase: true, match: /^[A-Z]{3}$/ },
    timezone: { type: String, default: 'Asia/Kolkata' },
    openingBalanceMinor: {
      type: Number,
      default: 0,
      min: -MAX_AMOUNT_MINOR,
      max: MAX_AMOUNT_MINOR,
      validate: { validator: Number.isSafeInteger, message: 'must be a whole number' },
    },
  },
  { timestamps: true, toJSON: toJSONOptions(['passwordHash', 'tokenVersion', 'resetTokenHash', 'resetTokenExpiresAt']) },
);

// Finding the account from a reset link.
userSchema.index({ resetTokenHash: 1 }, { sparse: true });

export const User = model('User', userSchema);
