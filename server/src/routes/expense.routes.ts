import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseFilterSchema,
} from '@expense-app/shared';
import { validateBody, validateQuery } from '../middlewares/validate';
import { authMiddleware } from '../middlewares/auth';
import { DataService } from '../services/data.service';
import { supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for receipts
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid receipt file format. Allowed: JPEG, PNG, WEBP, PDF'));
    }
  },
});

// GET /api/expenses
router.get('/', authMiddleware, validateQuery(expenseFilterSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { from, to, memberId, categoryId, search, limit, offset } = req.query as any;

    const result = await DataService.getExpenses(userId, {
      from,
      to,
      memberId,
      categoryId,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    res.json({
      success: true,
      data: result.expenses,
      totalCount: result.totalCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch expenses' });
  }
});

// POST /api/expenses
router.post('/', authMiddleware, validateBody(createExpenseSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const newExpense = await DataService.createExpense(userId, req.body);

    res.status(201).json({
      success: true,
      data: newExpense,
      message: 'Expense recorded successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create expense' });
  }
});

// POST /api/expenses/upload-receipt
router.post('/upload-receipt', authMiddleware, upload.single('receipt'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No receipt file provided' });
      return;
    }

    let receiptUrl = '';

    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const ext = req.file.mimetype === 'application/pdf' ? 'pdf' : (req.file.mimetype.split('/')[1] || 'jpg');
      const filePath = `${userId}/receipt_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('receipts')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        res.status(500).json({ success: false, error: uploadError.message });
        return;
      }

      // Generate signed URL (valid for 7 days) for private bucket, fallback to publicUrl
      const { data: signedData } = await supabaseAdmin.storage
        .from('receipts')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      if (signedData?.signedUrl) {
        receiptUrl = signedData.signedUrl;
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage.from('receipts').getPublicUrl(filePath);
        receiptUrl = publicUrl;
      }
    } else {
      receiptUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    res.json({
      success: true,
      data: { receipt_url: receiptUrl },
      message: 'Receipt uploaded successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to upload receipt' });
  }
});

// PATCH /api/expenses/:id
router.patch('/:id', authMiddleware, validateBody(updateExpenseSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const expenseId = req.params.id;

    const updated = await DataService.updateExpense(userId, expenseId, req.body);

    res.json({
      success: true,
      data: updated,
      message: 'Expense updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update expense' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const expenseId = req.params.id;

    await DataService.deleteExpense(userId, expenseId);

    res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete expense' });
  }
});

export default router;

