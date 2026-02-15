import fs from 'node:fs';
import path from 'node:path';

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return {};
  const env = {};
  for (const line of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    let v = t.slice(eq + 1).trim();
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'"))
      v = v.slice(1, -1);
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

const cwd = process.cwd();
const env = {
  ...loadEnv(path.join(cwd, '.env')),
  ...loadEnv(path.join(cwd, '.env.local')),
  ...process.env,
};
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const srk = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  // 1. List all public.users via service role
  const res1 = await fetch(`${url}/rest/v1/users?select=id,role,status,deleted_at`, {
    headers: { apikey: srk, Authorization: `Bearer ${srk}` },
  });
  const users = await res1.json();
  for (const _u of users) 

  // 2. For each sample account, sign in and query using the access token (like browser)
  const emails = [
    'employee@example.com',
    'intern@example.com',
    'admin@example.com',
    'super-admin@example.com',
  ];
  for (const email of emails) {
    const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        'Content-Type': 'application/json',
        'X-Supabase-Api-Version': '2024-01-01',
      },
      body: JSON.stringify({ email, password: 'SamplePass!234', gotrue_meta_security: {} }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      continue;
    }
    const accessToken = tokenData.access_token;
    const uid = tokenData.user?.id;

    // Query public.users using the access token (like the browser would)
    const roleRes = await fetch(
      `${url}/rest/v1/users?select=role&id=eq.${uid}`,
      {
        headers: { apikey: anon, Authorization: `Bearer ${accessToken}` },
      },
    );
    const _roleData = await roleRes.json();

    // Also try maybeSingle equivalent
    const singleRes = await fetch(
      `${url}/rest/v1/users?select=role&id=eq.${uid}`,
      {
        headers: {
          apikey: anon,
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.pgrst.object+json',
        },
      },
    );
    const _singleData = singleRes.ok ? await singleRes.json() : null;
  }
}

main().catch((e) => console.error(e));
