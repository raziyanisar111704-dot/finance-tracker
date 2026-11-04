import { Router } from 'express';
import * as reports from '../controllers/reports.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { reportQuery } from '../validators/report.validators.js';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: reportQuery }), reports.rangeReport);

export default router;
