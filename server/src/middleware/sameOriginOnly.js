import { AppError } from '../utils/AppError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF protection (second layer after SameSite cookies): browsers attach an
// Origin header to POST/PATCH/PUT/DELETE requests. If it names a different
// site than the one serving the API, the request is refused.
export function sameOriginOnly(req, res, next) {
  const origin = req.get('origin');
  // No Origin header: not a cross-site browser request (e.g. curl, tests).
  if (SAFE_METHODS.has(req.method) || !origin) return next();

  let originHost = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // "null" or malformed origins are rejected below.
  }

  const allowedHosts = [req.get('host'), req.get('x-forwarded-host')].filter(Boolean);
  if (!originHost || !allowedHosts.includes(originHost)) {
    throw new AppError(403, 'Cross-site requests are not allowed.');
  }
  next();
}
