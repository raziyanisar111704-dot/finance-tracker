import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { endSession, readSession } from '../utils/session.js';

// Protects a route: only logged-in users get through, and `req.userId` is set
// so every query can be limited to that user's own data.
export async function requireAuth(req, res, next) {
  const session = readSession(req);
  if (!session) {
    throw new AppError(401, 'Please log in to continue.');
  }

  const user = await User.findById(session.sub).select('+tokenVersion');
  // tokenVersion changes on "log out of all devices", invalidating old tokens.
  if (!user || user.tokenVersion !== session.tv) {
    endSession(res);
    throw new AppError(401, 'Your session has expired. Please log in again.');
  }

  req.user = user;
  req.userId = user._id;
  next();
}
