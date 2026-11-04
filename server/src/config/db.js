import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

if (env.DNS_SERVERS?.length) {
  dns.setServers(env.DNS_SERVERS);
}

// Only fields defined in a schema can be used in query filters.
// Protection against NoSQL injection ({ "$gt": "" } sent instead of a string)
// comes from Zod: every request is validated so values have the expected type.
mongoose.set('strictQuery', true);

// On Vercel, a function instance can stay "warm" and serve many requests.
// Caching the connection promise on globalThis lets those requests share one
// connection instead of opening a new one each time.
const cache = globalThis.__mongooseCache ?? (globalThis.__mongooseCache = { promise: null });

export function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 5,
      })
      .then((m) => m.connection)
      .catch((err) => {
        // Allow the next request to retry instead of reusing a failed attempt.
        cache.promise = null;
        throw err;
      });
  }
  return cache.promise;
}

export async function pingDB() {
  const connection = await connectDB();
  await connection.db.command({ ping: 1 });
}
