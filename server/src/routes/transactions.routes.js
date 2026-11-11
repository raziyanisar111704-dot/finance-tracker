import { Router } from 'express';
import * as imports from '../controllers/import.controller.js';
import * as transactions from '../controllers/transactions.controller.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  checkDuplicatesSchema,
  createTransactionSchema,
  importIdParams,
  importTransactionsSchema,
  listTransactionsQuery,
  updateTransactionSchema,
} from '../validators/transaction.validators.js';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: listTransactionsQuery }), transactions.listTransactions);
router.post('/', validate({ body: createTransactionSchema }), transactions.createTransaction);

// CSV import. Registered before "/:id" so "import" isn't read as an id.
router.post('/import/check', validate({ body: checkDuplicatesSchema }), imports.checkDuplicates);
router.post(
  '/import',
  rateLimit({
    name: 'import',
    windowMs: 60 * 60 * 1000,
    max: 20,
    key: (req) => req.userId,
    message: 'You have imported 20 files in the last hour. Please wait a while and try again.',
  }),
  validate({ body: importTransactionsSchema }),
  imports.importTransactions,
);
router.delete('/import/:importId', validate({ params: importIdParams }), imports.undoImport);

router.get('/:id', validate({ params: idParams }), transactions.getTransaction);
router.patch(
  '/:id',
  validate({ params: idParams, body: updateTransactionSchema }),
  transactions.updateTransaction,
);
router.delete('/:id', validate({ params: idParams }), transactions.deleteTransaction);

export default router;
