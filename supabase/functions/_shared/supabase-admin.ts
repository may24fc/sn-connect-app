import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client using the service role key.
 * This client bypasses Row Level Security (RLS) — use with extreme caution.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from Deno environment.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    throw new Error(
      'Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
