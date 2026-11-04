import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const SESSION_COOKIE = 'ft_session';
const SESSION_DAYS = 7;

// HttpOnly: page JavaScript can't read it, so an XSS bug can't steal it.
// Secure: only sent over HTTPS (production). SameSite=Lax: not sent with
// form posts from other websites, which blocks most CSRF attacks.
const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  path: '/',
};

export function startSession(res, user) {
  const token = jwt.sign({ tv: user.tokenVersion ?? 0 }, env.JWT_SECRET, {
    subject: user._id.toString(),
    expiresIn: `${SESSION_DAYS}d`,
    algorithm: 'HS256',
  });
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function endSession(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

// Returns the verified token payload ({ sub, tv }) or null.
export function readSession(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}
