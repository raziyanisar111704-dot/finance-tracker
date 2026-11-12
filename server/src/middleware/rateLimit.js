import { RateLimit } from '../models/RateLimit.js';
import { AppError } from '../utils/AppError.js';

// Allows at most `max` requests per `windowMs` for each key (by default the
// client IP). Counters live in MongoDB so all serverless instances share them.
export function rateLimit({ name, windowMs, max, key = (req) => req.ip, message }) {
  return async (req, res, next) => {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowEnd = windowStart + windowMs;
    const counter = await increment(`${name}:${key(req)}:${windowStart}`, new Date(windowEnd));

    if (counter.count > max) {
      res.set('Retry-After', String(Math.ceil((windowEnd - now) / 1000)));
      throw new AppError(429, message ?? 'Too many attempts. Please wait a few minutes and try again.');
    }
    next();
  };
}

async function increment(key, expiresAt) {
  const filter = { key };
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt } };
  const options = { upsert: true, returnDocument: 'after' };
  try {
    return await RateLimit.findOneAndUpdate(filter, update, options);
  } catch (err) {
    // Two simultaneous first requests can both try to insert; the loser
    // retries once, and by then the document exists.
    if (err.code !== 11000) throw err;
    return RateLimit.findOneAndUpdate(filter, update, options);
  }
}

// Forgets a limiter's counters for one key, e.g. lifts the per-email login
// lock once the owner has proved access to the email by resetting the password.
export function clearRateLimit(name, key) {
  const escaped = String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return RateLimit.deleteMany({ key: { $regex: `^${name}:${escaped}:` } });
}
