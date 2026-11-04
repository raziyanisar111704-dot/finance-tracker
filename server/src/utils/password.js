import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

// Cost 12 ≈ a few hundred ms per hash: fine for one login, very slow for an
// attacker guessing millions of passwords. Tests use 4 to stay fast.
const ROUNDS = env.NODE_ENV === 'test' ? 4 : 12;

let dummyHash;

export function hashPassword(password) {
  return bcrypt.hash(password, ROUNDS);
}

// When the email doesn't exist we still run a comparison against a dummy
// hash, so the response takes the same time and doesn't reveal which emails
// have accounts.
export async function verifyPassword(password, hash) {
  if (!hash) {
    dummyHash ??= await bcrypt.hash('dummy-password-for-timing', ROUNDS);
    await bcrypt.compare(password, dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}
