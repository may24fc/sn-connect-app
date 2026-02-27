/**
 * Edge Function authentication utilities.
 *
 * Validates that the caller is an authorized admin (server-to-server calls).
 * Supports two auth methods:
 *   1. Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   2. X-Admin-Key: <ADMIN_SECRET_KEY>
 */

interface AuthResult {
  ok: boolean;
  error?: string;
}

export function validateAdminAuth(req: Request): AuthResult {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const adminSecretKey = Deno.env.get('ADMIN_SECRET_KEY');

  // Method 1: Bearer token matching service role key
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (serviceRoleKey && token === serviceRoleKey) {
      return { ok: true };
    }
  }

  // Method 2: X-Admin-Key header
  const adminKeyHeader = req.headers.get('x-admin-key');
  if (adminKeyHeader && adminSecretKey && adminKeyHeader === adminSecretKey) {
    return { ok: true };
  }

  return {
    ok: false,
    error: 'Unauthorized: Missing or invalid authentication credentials',
  };
}
