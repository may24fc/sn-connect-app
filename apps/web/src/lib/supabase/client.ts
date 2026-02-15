import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function createSupabaseBrowserClient() {
  if (!(supabaseUrl && supabaseAnonKey)) {
    // Not configured for this environment (e.g. local without .env loaded).
    // Return null so callers can gracefully degrade to mock auth or client-side flows.
    return null as unknown as ReturnType<typeof createBrowserClient> | null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
