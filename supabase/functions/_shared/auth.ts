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

  // Constant-time string comparison to prevent timing attacks
  function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const encoder = new TextEncoder();
    const aBuf = encoder.encode(a);
    const bBuf = encoder.encode(b);
    // Use crypto.subtle.timingSafeEqual if available, otherwise XOR comparison
    let result = 0;
    for (let i = 0; i < aBuf.length; i++) {
      result |= aBuf[i] ^ bBuf[i];
    }
    return result === 0;
  }

  // Method 1: Bearer token matching service role key
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (serviceRoleKey && timingSafeEqual(token, serviceRoleKey)) {
      return { ok: true };
    }
  }

  // Method 2: X-Admin-Key header
  const adminKeyHeader = req.headers.get('x-admin-key');
  if (adminKeyHeader && adminSecretKey && timingSafeEqual(adminKeyHeader, adminSecretKey)) {
    return { ok: true };
  }

  return {
    ok: false,
    error: 'Unauthorized: Missing or invalid authentication credentials',
  };
}
