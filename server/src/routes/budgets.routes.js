import { Router } from 'express';
import * as budgets from '../controllers/budgets.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  copyBudgetsSchema,
  listBudgetsQuery,
  upsertBudgetSchema,
} from '../validators/budget.validators.js';
import { idParams } from '../validators/common.js';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: listBudgetsQuery }), budgets.listBudgets);
router.put('/', validate({ body: upsertBudgetSchema }), budgets.upsertBudget);
router.post('/copy', validate({ body: copyBudgetsSchema }), budgets.copyBudgets);
router.delete('/:id', validate({ params: idParams }), budgets.deleteBudget);

export default router;
