import fs from 'fs';

// Load prod env file specifically
const env = {};
for (const line of fs.readFileSync('.env.local.prodops', 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  let v = t.slice(i + 1).trim();
  if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'")) v = v.slice(1, -1);
  env[t.slice(0, i).trim()] = v;
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const srk = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !srk) throw new Error('Missing production credentials in .env.local.prodops');
console.log('Cleaning up seed data from:', url);

const reqHeaders = {
  apikey: srk,
  Authorization: 'Bearer ' + srk,
  'Content-Type': 'application/json',
};

// The three employee IDs used in the seed script
const SEEDED_EMPLOYEE_IDS = [
  '3c40e0b5-a005-4ea1-8688-d2670524f185', // EMP1 - Marketing
  '4f2ee829-d4b6-44df-9c72-b502ea5c534e', // EMP2 - Marketing
  '3bf99593-5f9b-4e19-b8f1-98f316ad1409', // EMP3 - Operations
];

async function countEntries(dateFrom, dateTo) {
  const r = await fetch(
    `${url}/rest/v1/expense_entries?select=id&deleted_at=is.null&transaction_date=gte.${dateFrom}&transaction_date=lte.${dateTo}`,
    { headers: { apikey: srk, Authorization: 'Bearer ' + srk, Prefer: 'count=exact', Range: '0-0' } }
  );
  const count = r.headers.get('content-range')?.split('/')?.[1] ?? '?';
  console.log(`  DB count ${dateFrom} to ${dateTo}: ${count} entries`);
}

async function deleteBatch(label, dateFrom, dateTo) {
  // Build a filter for any of the three employee IDs within the date range.
  // PostgREST supports `or` via query param: or=(col.eq.val1,col.eq.val2,...)
  const empFilter = SEEDED_EMPLOYEE_IDS.map((id) => `employee_id.eq.${id}`).join(',');
  const params = new URLSearchParams({
    transaction_date: `gte.${dateFrom}`,
    // PostgREST range filters need separate params; use `and` style below
  });

  // PostgREST delete with multiple filters:
  // DELETE /expense_entries?or=(employee_id.eq.X,...)&transaction_date=gte.Y&transaction_date=lte.Z
  const filterUrl =
    `${url}/rest/v1/expense_entries` +
    `?or=(${encodeURIComponent(empFilter)})` +
    `&transaction_date=gte.${dateFrom}` +
    `&transaction_date=lte.${dateTo}`;

  const r = await fetch(filterUrl, {
    method: 'DELETE',
    headers: { ...reqHeaders, Prefer: 'return=minimal' },
  });

  if (r.ok) {
    console.log(`✓ Deleted ${label} seed rows (HTTP ${r.status})`);
  } else {
    const body = await r.text();
    console.error(`✗ Failed to delete ${label}: HTTP ${r.status} — ${body.slice(0, 400)}`);
  }
}

console.log('\n--- Pre-cleanup counts ---');
await countEntries('2026-05-01', '2026-05-31');
await countEntries('2026-06-01', '2026-06-30');

console.log('\n--- Deleting seeded rows ---');
await deleteBatch('May 2026', '2026-05-01', '2026-05-31');
await deleteBatch('June 2026', '2026-06-01', '2026-06-30');

console.log('\n--- Post-cleanup counts ---');
await countEntries('2026-05-01', '2026-05-31');
await countEntries('2026-06-01', '2026-06-30');
console.log('\nDone.');
