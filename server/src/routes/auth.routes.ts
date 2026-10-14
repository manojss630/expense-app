import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { registerSchema, loginSchema } from '@expense-app/shared';
import { validateBody } from '../middlewares/validate';
import { supabaseClient, supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { DataService } from '../services/data.service';

const router = Router();

// POST /api/auth/register
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, phone, avatar_url } = req.body;

    // If Supabase is connected
    if (supabaseClient && !env.IS_DEMO_MODE) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            phone: phone || null,
            avatar_url: avatar_url || null,
          },
        },
      });

      if (error) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }

      if (!data.user) {
        res.status(400).json({ success: false, error: 'Registration failed' });
        return;
      }

      const token = data.session?.access_token || jwt.sign(
        { id: data.user.id, email: data.user.email, full_name, role: 'admin' },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
            full_name,
            phone,
            avatar_url,
            role: 'admin',
          },
          token,
        },
      });
      return;
    }

    // Demo Mode fallback
    const mockId = '00000000-0000-0000-0000-000000000001';
    await DataService.updateProfile(mockId, {
      full_name,
      phone,
      avatar_url,
    });

    const token = jwt.sign(
      { id: mockId, email, full_name, role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: mockId,
          email,
          full_name,
          phone,
          avatar_url,
          role: 'admin',
        },
        token,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Registration error' });
  }
});

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Demo mode quick access / Ramesh login check
    if (email === 'ramesh@example.com' || env.IS_DEMO_MODE) {
      const { profile, familyGroup } = await DataService.getProfile('00000000-0000-0000-0000-000000000001');
      const token = jwt.sign(
        { id: profile.id, email, full_name: profile.full_name, role: profile.role },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: {
          user: {
            id: profile.id,
            email,
            full_name: profile.full_name,
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            role: profile.role,
          },
          token,
          familyGroup,
        },
      });
      return;
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        res.status(401).json({ success: false, error: error.message });
        return;
      }

      const { profile, familyGroup } = await DataService.getProfile(data.user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
            full_name: profile?.full_name || data.user.user_metadata?.full_name || 'User',
            phone: profile?.phone,
            avatar_url: profile?.avatar_url,
            role: profile?.role || 'member',
          },
          token: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
          familyGroup,
        },
      });
      return;
    }

    res.status(401).json({ success: false, error: 'Invalid email or password' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Login error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  if (supabaseClient && !env.IS_DEMO_MODE) {
    await supabaseClient.auth.signOut();
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
