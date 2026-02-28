/**
 * Standard CORS headers for Supabase Edge Functions.
 *
 * These functions are invoked server-to-server (Vercel → Supabase) or via
 * supabase.functions.invoke(), so permissive CORS is acceptable.
 */
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
    return new Response('ok', { status: 204, headers: corsHeaders });
  }
  return null;
}
