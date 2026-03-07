import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Server-side Supabase client using the anon key.
 * Used for public read operations respecting RLS.
 */
export function createSupabaseServerClient() {
  if (!(supabaseUrl && supabaseAnonKey)) {
    throw new Error('Supabase environment variables are not configured.');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Admin Supabase client that bypasses RLS.
 * Only use for server-side write operations (form submissions, file uploads).
 */
export function createSupabaseAdminClient() {
  if (!(supabaseUrl && supabaseServiceRoleKey)) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
