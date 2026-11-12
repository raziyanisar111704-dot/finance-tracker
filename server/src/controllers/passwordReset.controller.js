import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { clearRateLimit } from '../middleware/rateLimit.js';
import { User } from '../models/User.js';
import {
  emailIsConfigured,
  passwordChangedEmail,
  passwordResetEmail,
  sendEmail,
} from '../services/email.service.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword } from '../utils/password.js';
import { endSession } from '../utils/session.js';

export const RESET_MINUTES = 30;
const SENT_MESSAGE =
  "If an account exists for that email, we've sent a link to reset the password. It works for 30 minutes.";
const INVALID_LINK = 'This reset link is invalid, already used or expired. Ask for a new one.';

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

// POST /api/auth/forgot-password { email }
// Always gives the same answer, whether or not the email has an account.
export async function forgotPassword(req, res) {
  if (!emailIsConfigured()) {
    throw new AppError(503, 'Password reset by email is not set up on this site yet.');
  }
  const { email } = req.valid.body;
  const user = await User.findOne({ email });

  if (user) {
    // 256 random bits: impossible to guess. A new request replaces any older
    // link, so only the latest email works.
    const token = randomBytes(32).toString('base64url');
    await User.updateOne(
      { _id: user._id },
      { $set: { resetTokenHash: sha256(token), resetTokenExpiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) } },
    );
    await sendEmail(
      passwordResetEmail({
        to: user.email,
        name: user.name,
        url: `${env.APP_URL}/reset-password?token=${token}`,
        minutes: RESET_MINUTES,
      }),
    );
  }
  res.json({ message: SENT_MESSAGE });
}

// POST /api/auth/reset-password { token, password }
export async function resetPassword(req, res) {
  const { token, password } = req.valid.body;
  const tokenHash = sha256(token);
  const user = await User.findOne({ resetTokenHash: tokenHash, resetTokenExpiresAt: { $gt: new Date() } }).select(
    '+resetTokenHash',
  );
  if (!user) throw new AppError(400, INVALID_LINK);

  // The filter on the token makes the link single-use even if it's submitted
  // twice at the same moment. Bumping tokenVersion logs out every device.
  const result = await User.updateOne(
    { _id: user._id, resetTokenHash: tokenHash },
    {
      $set: { passwordHash: await hashPassword(password) },
      $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 },
      $inc: { tokenVersion: 1 },
    },
  );
  if (result.modifiedCount === 0) throw new AppError(400, INVALID_LINK);

  // The owner proved access to the inbox: lift a "too many attempts" lock.
  await clearRateLimit('login-email', user.email);

  // Tell the owner. Best effort: the password is already changed.
  try {
    await sendEmail(passwordChangedEmail({ to: user.email, name: user.name, url: `${env.APP_URL}/forgot-password` }));
  } catch (err) {
    console.error('Password-changed email failed:', err.message);
  }

  endSession(res);
  res.json({ message: 'Your password has been changed. Log in with your new password.' });
}
