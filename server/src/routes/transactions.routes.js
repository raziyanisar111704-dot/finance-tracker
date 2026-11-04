import { Router } from 'express';
import * as transactions from '../controllers/transactions.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  createTransactionSchema,
  listTransactionsQuery,
  updateTransactionSchema,
} from '../validators/transaction.validators.js';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: listTransactionsQuery }), transactions.listTransactions);
router.post('/', validate({ body: createTransactionSchema }), transactions.createTransaction);
router.get('/:id', validate({ params: idParams }), transactions.getTransaction);
router.patch(
  '/:id',
  validate({ params: idParams, body: updateTransactionSchema }),
  transactions.updateTransaction,
);
router.delete('/:id', validate({ params: idParams }), transactions.deleteTransaction);

export default router;
