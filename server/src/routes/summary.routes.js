import { Router } from 'express';
import * as reports from '../controllers/reports.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { monthSummaryQuery, trendQuery } from '../validators/report.validators.js';

const router = Router();
router.use(requireAuth);

router.get('/month', validate({ query: monthSummaryQuery }), reports.monthSummary);
router.get('/trend', validate({ query: trendQuery }), reports.trend);

export default router;
