import { model, Schema } from 'mongoose';

// Request counters for rate limiting. Stored in MongoDB (not memory) because
// serverless instances don't share memory. MongoDB deletes each document
// automatically once `expiresAt` has passed (TTL index, `expires: 0`).
const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const RateLimit = model('RateLimit', rateLimitSchema);
