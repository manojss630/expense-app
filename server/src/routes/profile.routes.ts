import { Router, Request, Response } from 'express';
import multer from 'multer';
import { updateProfileSchema, changePasswordSchema } from '@expense-app/shared';
import { validateBody } from '../middlewares/validate';
import { authMiddleware } from '../middlewares/auth';
import { DataService } from '../services/data.service';
import { supabaseAdmin, supabaseClient } from '../config/supabase';
import { env } from '../config/env';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Allowed: JPEG, PNG, WEBP, GIF'));
    }
  },
});

// GET /api/profile
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { profile, familyGroup } = await DataService.getProfile(userId);
    const members = await DataService.getFamilyMembers(userId);

    res.json({
      success: true,
      data: {
        profile,
        familyGroup,
        memberCount: members.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch profile' });
  }
});

// PATCH /api/profile
router.patch('/', authMiddleware, validateBody(updateProfileSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const updated = await DataService.updateProfile(userId, req.body);

    res.json({
      success: true,
      data: updated,
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update profile' });
  }
});

// POST /api/profile/avatar
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No avatar image file provided' });
      return;
    }

    let avatarUrl = '';

    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const ext = req.file.mimetype.split('/')[1] || 'jpg';
      const filePath = `${userId}/avatar_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        res.status(500).json({ success: false, error: uploadError.message });
        return;
      }

      // Try signed URL first for private bucket, fallback to publicUrl
      const { data: signedData } = await supabaseAdmin.storage
        .from('avatars')
        .createSignedUrl(filePath, 60 * 60 * 24 * 30); // 30 days

      if (signedData?.signedUrl) {
        avatarUrl = signedData.signedUrl;
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = publicUrl;
      }
    } else {
      // Demo base64 data URI
      avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const updated = await DataService.updateProfile(userId, { avatar_url: avatarUrl });

    res.json({
      success: true,
      data: {
        avatar_url: avatarUrl,
        profile: updated,
      },
      message: 'Avatar uploaded successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to upload avatar' });
  }
});

// POST /api/profile/change-password
router.post('/change-password', authMiddleware, validateBody(changePasswordSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { new_password } = req.body;
    if (supabaseClient && !env.IS_DEMO_MODE) {
      const { error } = await supabaseClient.auth.updateUser({ password: new_password });
      if (error) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update password' });
  }
});

// POST /api/profile/delete-account
router.post('/delete-account', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    if (supabaseAdmin && !env.IS_DEMO_MODE) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        res.status(500).json({ success: false, error: error.message });
        return;
      }
    }

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete account' });
  }
});

export default router;

