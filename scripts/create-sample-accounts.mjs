import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PASSWORD = 'SamplePass!234';
const DEFAULT_DOMAIN = 'example.com';

const sampleUsers = [
  {
    role: 'employee',
    emailLocalPart: 'employee',
    fullName: 'Sample Employee',
  },
  {
    role: 'intern',
    emailLocalPart: 'intern',
    fullName: 'Sample Intern',
  },
  {
    role: 'admin',
    emailLocalPart: 'admin',
    fullName: 'Sample Admin',
  },
  {
    role: 'super_admin',
    emailLocalPart: 'super-admin',
    fullName: 'Sample Super Admin',
  },
];

/* ------------------------------------------------------------------ */
/*  Env helpers                                                       */
/* ------------------------------------------------------------------ */

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) return null;
  const key = trimmed.slice(0, eqIndex).trim();
  let value = trimmed.slice(eqIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed) env[parsed.key] = parsed.value;
  }
  return env;
}

function getEnv() {
  const cwd = process.cwd();
  const envLocal = loadEnvFile(path.join(cwd, '.env.local'));
  const envBase = loadEnvFile(path.join(cwd, '.env'));
  return { ...envBase, ...envLocal, ...process.env };
}

function redact(value) {
  if (!value) return '';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/*  Fetch helper                                                      */
/* ------------------------------------------------------------------ */

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error_description || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

/* ------------------------------------------------------------------ */
/*  Supabase Admin helpers                                            */
/* ------------------------------------------------------------------ */

async function listAuthUsers(baseUrl, headers) {
  const url = new URL('/auth/v1/admin/users', baseUrl);
  const data = await fetchJson(url.toString(), { headers });
  return Array.isArray(data?.users) ? data.users : [];
}

async function getAuthUserByEmail(baseUrl, headers, email) {
  const users = await listAuthUsers(baseUrl, headers);
  return users.find((u) => u.email === email) || null;
}

async function deleteAuthUser(baseUrl, headers, userId) {
  const url = new URL(`/auth/v1/admin/users/${userId}`, baseUrl);
  return fetchJson(url.toString(), { method: 'DELETE', headers });
}

/**
 * Create a user via the admin endpoint.
 *
 * Uses `generate_link` with type=signup first. This endpoint reliably
 * creates a row in auth.identities (provider = 'email') which the
 * browser's GoTrue client (api-version 2024-01-01) requires for
 * password sign-in.
 *
 * Falls back to plain admin create if generate_link is not available.
 */
async function createUserWithIdentity(baseUrl, headers, { email, password, fullName, role }) {
  // Step 1 – sign-up link to guarantee an email identity row exists
  const linkUrl = new URL('/auth/v1/admin/generate_link', baseUrl);
  let user;
  try {
    const linkRes = await fetchJson(linkUrl.toString(), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'signup',
        email,
        password,
        data: { full_name: fullName },
      }),
    });
    user = linkRes; // generate_link returns the user object directly
  } catch (_err) {
    const createUrl = new URL('/auth/v1/admin/users', baseUrl);
    user = await fetchJson(createUrl.toString(), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      }),
    });
  }

  const userId = user?.id;
  if (!userId) throw new Error(`No user id returned for ${email}`);

  // Step 2 – confirm email & set password via admin update
  // This ensures the user is confirmed and the password hash is current.
  const updateUrl = new URL(`/auth/v1/admin/users/${userId}`, baseUrl);
  const updated = await fetchJson(updateUrl.toString(), {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: { provider: 'email', providers: ['email'], db_role: role },
      user_metadata: { full_name: fullName },
    }),
  });

  return updated;
}

async function upsertPublicUser(baseUrl, headers, payload) {
  const url = new URL('/rest/v1/users', baseUrl);
  url.searchParams.set('on_conflict', 'id');
  return fetchJson(url.toString(), {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });
}

/* ------------------------------------------------------------------ */
/*  Validation – matches what the browser's @supabase/ssr sends       */
/* ------------------------------------------------------------------ */

async function validatePasswordLogin(baseUrl, anonKey, email, password) {
  if (!anonKey) {
    return;
  }

  const url = new URL('/auth/v1/token', baseUrl);
  url.searchParams.set('grant_type', 'password');

  // Send the same headers / body shape that @supabase/ssr 0.7+ sends
  // from the browser so we catch identity issues here rather than at
  // runtime.
  try {
    await fetchJson(url.toString(), {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'X-Supabase-Api-Version': '2024-01-01',
      },
      body: JSON.stringify({
        email,
        password,
        gotrue_meta_security: {},
      }),
    });
  } catch (error) {
    const reason = error?.message || 'Unknown error';
    throw new Error(
      `Login check FAILED for ${email}: ${reason}\n  This means the browser will also fail. Check auth.identities.`
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  const env = getEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  const password = env.SAMPLE_USER_PASSWORD || DEFAULT_PASSWORD;
  const domain = env.SAMPLE_USER_DOMAIN || DEFAULT_DOMAIN;

  if (!(supabaseUrl && serviceRoleKey)) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
  }

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const adminHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  for (const user of sampleUsers) {
    const email = `${user.emailLocalPart}@${domain}`;

    // Delete any existing user so we get a clean slate
    const existing = await getAuthUserByEmail(baseUrl, adminHeaders, email);
    if (existing) {
      await deleteAuthUser(baseUrl, adminHeaders, existing.id);
      // Small delay so GoTrue fully removes the row
      await new Promise((r) => setTimeout(r, 500));
    }

    // Create with identity
    const created = await createUserWithIdentity(baseUrl, adminHeaders, {
      email,
      password,
      fullName: user.fullName,
      role: user.role,
    });

    const identities = created?.identities || [];
    const hasEmail = identities.some((i) => i.provider === 'email');

    if (!hasEmail) {
      console.warn(
        '  ⚠  No email identity found – login may fail. Will attempt generate_link fix…'
      );
      // Try generate_link as a last-resort fix
      const linkUrl = new URL('/auth/v1/admin/generate_link', baseUrl);
      try {
        await fetchJson(linkUrl.toString(), {
          method: 'POST',
          headers: { ...adminHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'signup', email, password }),
        });
      } catch (e) {
        console.warn(`  generate_link fix failed: ${e.message}`);
      }
    }

    // Upsert public.users row with role
    await upsertPublicUser(baseUrl, adminHeaders, {
      id: created.id,
      role: user.role,
      status: 'active',
    });

    // Validate login using browser-equivalent headers
    await validatePasswordLogin(baseUrl, anonKey, email, password);
  }
  for (const _user of sampleUsers) {
  }
}

main().catch((error) => {
  console.error('');
  console.error('❌ Failed:', error.message || error);
  if (error?.payload) {
    console.error('Details:', JSON.stringify(error.payload, null, 2));
  }
  process.exit(1);
});
