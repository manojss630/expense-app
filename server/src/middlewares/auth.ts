import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseClient } from '../config/supabase';
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

    // Check if demo token
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

    // If using Supabase Client
    if (supabaseClient) {
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);
      if (error || !user) {
        // Fallback check if it's signed with local JWT secret
        try {
          const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
          req.user = decoded;
          return next();
        } catch {
          res.status(401).json({ success: false, error: 'Unauthorized: Invalid Supabase token' });
          return;
        }
      }

      req.user = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || 'User',
        role: user.user_metadata?.role || 'member',
      };
      return next();
    }

    // Standard JWT verification fallback
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
      return next();
    } catch {
      res.status(401).json({ success: false, error: 'Unauthorized: Token verification failed' });
    }
  } catch (error) {
    console.error('Auth Middleware error:', error);
    res.status(500).json({ success: false, error: 'Internal authentication error' });
  }
};
