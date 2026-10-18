import dotenv from 'dotenv';
import path from 'path';

// Load .env from current working directory, server directory, or project root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const rawDemoMode = (process.env.DEMO_MODE || '').trim().toLowerCase();
const isDemoModeExplicit = rawDemoMode === 'true' || rawDemoMode === '1';

if (isProduction && isDemoModeExplicit) {
  throw new Error('FATAL: DEMO_MODE is strictly forbidden in production.');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Missing Supabase configuration must fail clearly, not activate demo mode
if (!isDemoModeExplicit) {
  const missing: string[] = [];
  if (!supabaseUrl || supabaseUrl.includes('your-project')) missing.push('SUPABASE_URL');
  if (!supabaseAnonKey || supabaseAnonKey.includes('your-anon-key')) missing.push('SUPABASE_ANON_KEY');
  if (!supabaseServiceRoleKey || supabaseServiceRoleKey.includes('your-service-role-key')) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    throw new Error(
      `FATAL CONFIGURATION ERROR: Missing required Supabase credentials: ${missing.join(', ')}. ` +
      `ExpenseApp runs against real Supabase by default and will not silently fall back to demo mode. ` +
      `Please provide valid Supabase credentials in your .env or server environment.`
    );
  }
}

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
  // JWT_SECRET is ONLY used for isolated offline tests. Not retained in production.
  JWT_SECRET: process.env.JWT_SECRET || (isProduction ? '' : 'expense-app-local-test-secret-min32chars'),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  IS_DEMO_MODE: isDemoModeExplicit,
};

