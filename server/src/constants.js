// Values shared by models and validators, so the rules live in one place.

export const TRANSACTION_TYPES = ['income', 'expense'];

export const PAYMENT_METHODS = [
  'cash',
  'debit_card',
  'credit_card',
  'upi',
  'bank_transfer',
  'wallet',
  'other',
];

// Money is stored as whole numbers of the smallest unit (paise for INR).
// 1e13 paise = ₹100,000 crore: far above any personal amount, far below
// Number.MAX_SAFE_INTEGER (≈ 9e15), so sums stay exact.
export const MAX_AMOUNT_MINOR = 1e13;

// Calendar date "YYYY-MM-DD" and month "YYYY-MM" (see docs/ARCHITECTURE.md §6).
export const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
