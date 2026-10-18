import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseClient, supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  family_group_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 1. Supabase Mode: Verify Supabase Auth access tokens exclusively using Supabase Auth
    if (!env.IS_DEMO_MODE && (supabaseClient || supabaseAdmin)) {
      const client = supabaseAdmin || supabaseClient;
      const { data: { user }, error } = await client!.auth.getUser(token);

      if (error || !user) {
        res.status(401).json({
          success: false,
          error: error?.message || 'Unauthorized: Invalid or expired Supabase token',
        });
        return;
      }

      let userRole = 'member';
      let fullName = user.user_metadata?.full_name || 'User';

      if (supabaseAdmin) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          userRole = profile.role || 'member';
          if (profile.full_name) fullName = profile.full_name;
        }
      }

      req.user = {
        id: user.id,
        email: user.email || '',
        full_name: fullName,
        role: userRole,
      };
      return next();
    }

    // 2. Demo / Offline Mode (ONLY allowed when env.IS_DEMO_MODE is true in local testing):
    if (env.IS_DEMO_MODE) {
      if (token.startsWith('demo-token-') || token === 'demo-token') {
        req.user = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'ramesh@example.com',
          full_name: 'Ramesh Kumar',
          role: 'admin',
          family_group_id: '11111111-1111-1111-1111-111111111111',
        };
        return next();
      }

      // Verify Express self-signed application JWTs using the server-only secret
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
        req.user = decoded;
        return next();
      } catch {
        res.status(401).json({ success: false, error: 'Unauthorized: Demo token verification failed' });
        return;
      }
    }

    res.status(401).json({ success: false, error: 'Unauthorized: Valid Supabase session required' });
    return;
  } catch (error) {
    console.error('Auth Middleware error:', error);
    res.status(500).json({ success: false, error: 'Internal authentication error' });
  }
};

