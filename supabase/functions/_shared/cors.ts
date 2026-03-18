/**
 * Standard CORS headers for Supabase Edge Functions.
 *
 * These functions are invoked server-to-server (Vercel -> Supabase) or via
 * supabase.functions.invoke(), so permissive CORS is acceptable for
 * development but should be restricted in production.
 */
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') ?? [];

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') ?? '';
  const allowedOrigin =
    ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

/** @deprecated Use getCorsHeaders(req) instead for origin-aware CORS. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Handle CORS preflight requests.
 * Returns a 204 response for OPTIONS, or null if this is not a preflight.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: getCorsHeaders(req) });
  }
  return null;
}
