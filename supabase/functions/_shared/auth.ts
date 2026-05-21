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

function validateAdminAuthExact(req: Request): AuthResult {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const adminSecretKey = Deno.env.get('ADMIN_SECRET_KEY');

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

async function validateServiceRoleBearer(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!authHeader?.startsWith('Bearer ') || !serviceRoleKey || !supabaseUrl) {
    return false;
  }

  try {
    // Some callers still hold a service-role JWT while the Edge Function env may use
    // the newer secret-key format. Validate the presented bearer by asking Supabase's
    // admin API whether it is accepted as a service-role credential.
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        apikey: serviceRoleKey,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

export function validateAdminAuth(req: Request): AuthResult {
  return validateAdminAuthExact(req);
}

export async function validateAdminAuthFlexible(req: Request): Promise<AuthResult> {
  const exact = validateAdminAuthExact(req);
  if (exact.ok) {
    return exact;
  }

  if (await validateServiceRoleBearer(req)) {
    return { ok: true };
  }

  return exact;
}
