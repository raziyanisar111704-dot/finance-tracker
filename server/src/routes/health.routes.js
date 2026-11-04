import { Router } from 'express';
import { pingDB } from '../config/db.js';

const router = Router();

// GET /api/health — confirms the API is running and can reach MongoDB.
router.get('/', async (req, res) => {
  const startedAt = Date.now();
  try {
    await pingDB();
    res.json({
      status: 'ok',
      db: 'ok',
      dbLatencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Health check: database unreachable:', err.message);
    res.status(503).json({
      status: 'degraded',
      db: 'error',
      time: new Date().toISOString(),
    });
  }
});

export default router;
