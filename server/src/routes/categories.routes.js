import { Router } from 'express';
import * as categories from '../controllers/categories.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  createCategorySchema,
  deleteCategoryQuery,
  listCategoriesQuery,
  updateCategorySchema,
} from '../validators/category.validators.js';
import { idParams } from '../validators/common.js';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: listCategoriesQuery }), categories.listCategories);
router.post('/', validate({ body: createCategorySchema }), categories.createCategory);
router.patch(
  '/:id',
  validate({ params: idParams, body: updateCategorySchema }),
  categories.updateCategory,
);
router.delete(
  '/:id',
  validate({ params: idParams, query: deleteCategoryQuery }),
  categories.deleteCategory,
);

export default router;
