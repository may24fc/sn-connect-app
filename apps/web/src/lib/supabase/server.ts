import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export function hasSupabaseAuthEnv(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export async function createSupabaseServerClient(): Promise<ReturnType<typeof createServerClient>> {
  if (!hasSupabaseAuthEnv()) {
    throw new Error('Supabase environment variables are not configured.');
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll was called from a Server Component.
          // This can be ignored if middleware is refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Creates a Supabase admin client with service role key.
 * **SECURITY WARNING**: This client bypasses ALL Row Level Security policies.
 * Only use for server-side admin operations (user creation, management, etc.)
 * NEVER expose this client or the service role key to the client side.
 *
 * @example
 * // In API routes only
 * const adminClient = createSupabaseAdminClient();
 * await adminClient.auth.admin.createUser({ email, password });
 */
export function createSupabaseAdminClient() {
  if (!(supabaseUrl && supabaseServiceRoleKey)) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
        'Get it from: https://supabase.com/dashboard/project/_/settings/api'
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
