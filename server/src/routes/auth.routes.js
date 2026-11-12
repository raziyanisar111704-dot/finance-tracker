import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import * as passwordReset from '../controllers/passwordReset.controller.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  deleteMeSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateMeSchema,
} from '../validators/auth.validators.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const router = Router();

router.post(
  '/register',
  rateLimit({ name: 'register-ip', windowMs: ONE_HOUR, max: 5 }),
  validate({ body: registerSchema }),
  auth.register,
);

router.post(
  '/login',
  // Limit per IP and per email: slows down password guessing from one
  // computer, and against one account from many computers.
  rateLimit({ name: 'login-ip', windowMs: FIFTEEN_MINUTES, max: 10 }),
  rateLimit({
    name: 'login-email',
    windowMs: FIFTEEN_MINUTES,
    max: 10,
    key: (req) => String(req.body?.email ?? '').trim().toLowerCase(),
  }),
  validate({ body: loginSchema }),
  auth.login,
);

// Password reset by email. Limits stop the form being used to flood an inbox
// (per email) or to spam many addresses (per IP).
router.post(
  '/forgot-password',
  rateLimit({ name: 'forgot-ip', windowMs: ONE_HOUR, max: 5, message: 'Too many reset requests. Please wait an hour and try again.' }),
  rateLimit({
    name: 'forgot-email',
    windowMs: ONE_HOUR,
    max: 3,
    key: (req) => String(req.body?.email ?? '').trim().toLowerCase(),
    message: 'Too many reset emails for this address. Check your inbox and spam folder, or try again in an hour.',
  }),
  validate({ body: forgotPasswordSchema }),
  passwordReset.forgotPassword,
);
router.post(
  '/reset-password',
  rateLimit({ name: 'reset-ip', windowMs: FIFTEEN_MINUTES, max: 10 }),
  validate({ body: resetPasswordSchema }),
  passwordReset.resetPassword,
);

router.post('/logout', auth.logout);
router.post('/logout-all', requireAuth, auth.logoutAllDevices);

router.get('/me', requireAuth, auth.getMe);
router.patch('/me', requireAuth, validate({ body: updateMeSchema }), auth.updateMe);
router.delete(
  '/me',
  requireAuth,
  rateLimit({ name: 'delete-account', windowMs: FIFTEEN_MINUTES, max: 5, key: (req) => req.userId }),
  validate({ body: deleteMeSchema }),
  auth.deleteMe,
);

export default router;
