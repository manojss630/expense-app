import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory or project root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'expense-app-jwt-secret-key-32charsmin',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  IS_DEMO_MODE: !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project'),
};
