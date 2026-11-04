import { Router } from 'express';
import * as exporter from '../controllers/export.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { exportQuery } from '../validators/report.validators.js';

const router = Router();
router.use(requireAuth);

router.get('/transactions.csv', validate({ query: exportQuery }), exporter.exportTransactionsCsv);
router.get('/backup.json', exporter.exportBackup);

export default router;
