import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

export let supabaseClient: SupabaseClient | null = null;
export let supabaseAdmin: SupabaseClient | null = null;

if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY && !env.IS_DEMO_MODE) {
  try {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    if (env.SUPABASE_SERVICE_ROLE_KEY) {
      supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}
