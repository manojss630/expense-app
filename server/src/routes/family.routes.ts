import { Router, Request, Response } from 'express';
import { createFamilyMemberSchema } from '@expense-app/shared';
import { validateBody } from '../middlewares/validate';
import { authMiddleware } from '../middlewares/auth';
import { DataService } from '../services/data.service';

const router = Router();

// GET /api/family/members
router.get('/members', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const members = await DataService.getFamilyMembers(userId);

    res.json({
      success: true,
      data: members,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch family members' });
  }
});

// POST /api/family/members
router.post('/members', authMiddleware, validateBody(createFamilyMemberSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { display_name, user_id } = req.body;

    const newMember = await DataService.addFamilyMember(userId, display_name, user_id);

    res.status(201).json({
      success: true,
      data: newMember,
      message: 'Family member added successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to add family member' });
  }
});

export default router;
