// Runs before every test file: starts a throwaway in-memory MongoDB and points
// the app at it, so tests never touch your real Atlas data.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach } from 'vitest';

// Generous start-up limit: on Windows the first launch of mongod.exe can be
// slow while antivirus scans it. Later launches take ~1–2 seconds.
const mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 90_000 } });

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = mongo.getUri();
process.env.MONGODB_DB_NAME = 'finance-tracker-test';
process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough-1234567890';
delete process.env.DNS_SERVERS;

// Each test starts with empty collections.
afterEach(async () => {
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
