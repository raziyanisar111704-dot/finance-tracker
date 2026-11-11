// Sets a new password for an account, for when the owner has forgotten it
// (the app has no "forgot password" email yet). Run it on your own computer:
//
//   npm run reset-password -- you@example.com
//
// It uses MONGODB_URI from server/.env, i.e. your LOCAL database. For the live
// site, first put the production connection string in this terminal only:
//
//   $env:MONGODB_URI = "mongodb+srv://…production…"
//   npm run reset-password -- you@example.com
//   Remove-Item Env:MONGODB_URI
//
// (A variable set in the terminal wins over the one in server/.env.)
// It also logs the account out on every device.
import { createInterface } from 'node:readline';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { RateLimit } from '../src/models/RateLimit.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/utils/password.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: npm run reset-password -- you@example.com');
  process.exit(2);
}

const host = /@([^/?]+)/.exec(env.MONGODB_URI)?.[1] ?? 'unknown host';
console.log(`Database: ${host} / ${env.MONGODB_DB_NAME}`);

try {
  await connectDB();
  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No account with the email ${email} in this database.`);
    process.exitCode = 1;
  } else {
    // Read lines through the iterator: it keeps lines that arrive early (e.g.
    // both passwords pasted at once), which rl.question() would lose.
    const rl = createInterface({ input: process.stdin });
    const lines = rl[Symbol.asyncIterator]();
    const ask = async (prompt) => {
      process.stdout.write(prompt);
      const { value } = await lines.next();
      return value ?? '';
    };
    console.log('Note: the password is visible while you type. Make sure nobody is watching the screen.');
    const password = await ask('New password (10–64 characters): ');
    const again = await ask('Type it again: ');
    rl.close();

    const bytes = new TextEncoder().encode(password).length;
    if (password !== again) {
      console.error('The two passwords are different. Nothing was changed.');
      process.exitCode = 1;
    } else if (password.length < 10 || password.length > 64 || bytes > 72) {
      console.error('The password must be 10–64 characters (and at most 72 bytes). Nothing was changed.');
      process.exitCode = 1;
    } else {
      await User.updateOne(
        { _id: user._id },
        { $set: { passwordHash: await hashPassword(password) }, $inc: { tokenVersion: 1 } },
      );
      // Lift a login lock-out from the failed attempts, if there is one.
      await RateLimit.deleteMany({ key: { $regex: `^login-email:${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:` } });
      console.log(`Password changed for ${email}. Every device has been logged out; log in with the new password.`);
    }
  }
} catch (err) {
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
