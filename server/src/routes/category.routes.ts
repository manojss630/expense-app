import { Router, Request, Response } from 'express';
import { createCategorySchema } from '@expense-app/shared';
import { validateBody } from '../middlewares/validate';
import { authMiddleware } from '../middlewares/auth';
import { DataService } from '../services/data.service';

const router = Router();

// GET /api/categories
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const categories = await DataService.getCategories(userId);

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch categories' });
  }
});

// POST /api/categories
router.post('/', authMiddleware, validateBody(createCategorySchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, icon, color } = req.body;

    const newCategory = await DataService.addCategory(userId, { name, icon, color });

    res.status(201).json({
      success: true,
      data: newCategory,
      message: 'Category created successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create category' });
  }
});

export default router;
