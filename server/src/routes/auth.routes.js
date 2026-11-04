import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  deleteMeSchema,
  loginSchema,
  registerSchema,
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
