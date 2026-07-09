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
console.log('Seeding into:', url);

const reqHeaders = {
  apikey: srk,
  Authorization: 'Bearer ' + srk,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

async function insertBatch(label, rows) {
  const r = await fetch(url + '/rest/v1/expense_entries', {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(rows),
  });
  const body = await r.text();
  if (r.ok) {
    console.log(`✓ ${label}: ${rows.length} rows inserted (HTTP ${r.status})`);
  } else {
    console.error(`✗ ${label}: HTTP ${r.status} — ${body.slice(0, 400)}`);
  }
}

async function countEntries(dateFrom, dateTo) {
  const r = await fetch(
    `${url}/rest/v1/expense_entries?select=id&deleted_at=is.null&transaction_date=gte.${dateFrom}&transaction_date=lte.${dateTo}`,
    { headers: { apikey: srk, Authorization: 'Bearer ' + srk, Prefer: 'count=exact', Range: '0-0' } }
  );
  const count = r.headers.get('content-range')?.split('/')?.[1] ?? '?';
  console.log(`  DB count ${dateFrom} to ${dateTo}: ${count} entries`);
}

// ---------------------------------------------------------------------------
// Verify current state before seeding
// ---------------------------------------------------------------------------
console.log('\n--- Current production entry counts ---');
await countEntries('2026-05-01', '2026-05-31');
await countEntries('2026-06-01', '2026-06-30');
await countEntries('2026-07-01', '2026-07-31');

// ---------------------------------------------------------------------------
// Production IDs (fetched from tccdupkjmwwxcvpqnpeb.supabase.co)
// emp1 = Marketing  emp2 = Marketing  emp3 = Operations
// ---------------------------------------------------------------------------
const EMP1 = { id: '3c40e0b5-a005-4ea1-8688-d2670524f185', userId: '3e8e5940-5641-43d7-8fbc-7fdf5257d456', deptId: 'a7e8bc26-fd72-4d53-a00a-10755fab77f8' };
const EMP2 = { id: '4f2ee829-d4b6-44df-9c72-b502ea5c534e', userId: '72f6c444-edc6-44a1-9ef6-f00419ff9cbb', deptId: 'a7e8bc26-fd72-4d53-a00a-10755fab77f8' };
const EMP3 = { id: '3bf99593-5f9b-4e19-b8f1-98f316ad1409', userId: '3a3c78b2-3ac9-412c-831d-a518143ebcaa', deptId: 'cd7d1243-c4b4-48fa-bffa-04c6a4799038' };

// ---------------------------------------------------------------------------
// MAY 2026 — previous month baseline
// ---------------------------------------------------------------------------
const mayRows = [
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Adobe Creative Cloud', transaction_date: '2026-05-02', expense_type: 'software', total_amount: 89.99, total_amount_aud: 89.99, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Xero Accounting', transaction_date: '2026-05-05', expense_type: 'software', total_amount: 129.0, total_amount_aud: 129.0, currency: 'AUD', processing_status: 'auto_approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: EMP1.id, submitted_by: EMP1.userId, department_id: EMP1.deptId, vendor_name: 'Canva Pro', transaction_date: '2026-05-06', expense_type: 'software', total_amount: 149.0, total_amount_aud: 149.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Team Lunch Review', transaction_date: '2026-05-09', expense_type: 'meals', total_amount: 180.0, total_amount_aud: 180.0, currency: 'AUD', processing_status: 'auto_approved', risk_bucket: 'non_recurring', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Sydney Coworking Space', transaction_date: '2026-05-12', expense_type: 'utilities', total_amount: 320.0, total_amount_aud: 320.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: EMP2.id, submitted_by: EMP2.userId, department_id: EMP2.deptId, vendor_name: 'Standing Desk x2', transaction_date: '2026-05-14', expense_type: 'office_supplies', total_amount: 480.0, total_amount_aud: 480.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'non_recurring', match_status: 'resolved', source_type: 'direct_payment' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Melbourne Conference Flight', transaction_date: '2026-05-19', expense_type: 'travel', total_amount: 540.0, total_amount_aud: 540.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'non_recurring', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Google Workspace', transaction_date: '2026-05-21', expense_type: 'software', total_amount: 210.0, total_amount_aud: 210.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: EMP1.id, submitted_by: EMP1.userId, department_id: EMP1.deptId, vendor_name: 'Facebook Ads May', transaction_date: '2026-05-23', expense_type: 'other', total_amount: 1200.0, total_amount_aud: 1200.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'AWS Cloud Services', transaction_date: '2026-05-27', expense_type: 'software', total_amount: 590.0, total_amount_aud: 590.0, currency: 'AUD', processing_status: 'auto_approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Printer Maintenance', transaction_date: '2026-05-28', expense_type: 'maintenance', total_amount: 275.0, total_amount_aud: 275.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'non_recurring', match_status: 'resolved', source_type: 'direct_payment' },
];

// ---------------------------------------------------------------------------
// JUNE 2026 — current month
// ---------------------------------------------------------------------------
const juneRows = [
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Adobe Creative Cloud', transaction_date: '2026-06-03', expense_type: 'software', total_amount: 89.99, total_amount_aud: 89.99, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: EMP1.id, submitted_by: EMP1.userId, department_id: EMP1.deptId, vendor_name: 'Canva Pro', transaction_date: '2026-06-05', expense_type: 'software', total_amount: 149.0, total_amount_aud: 149.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Qantas Business', transaction_date: '2026-06-10', expense_type: 'travel', total_amount: 820.5, total_amount_aud: 820.5, currency: 'AUD', processing_status: 'approved', risk_bucket: 'price_spike', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Friday Lunch Debrief', transaction_date: '2026-06-12', expense_type: 'meals', total_amount: 210.0, total_amount_aud: 210.0, currency: 'AUD', processing_status: 'auto_approved', risk_bucket: 'non_recurring', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: EMP2.id, submitted_by: EMP2.userId, department_id: EMP2.deptId, vendor_name: 'IKEA Office Chairs x4', transaction_date: '2026-06-14', expense_type: 'office_supplies', total_amount: 640.0, total_amount_aud: 640.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'non_recurring', match_status: 'resolved', source_type: 'direct_payment' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Xero Accounting', transaction_date: '2026-06-16', expense_type: 'software', total_amount: 129.0, total_amount_aud: 129.0, currency: 'AUD', processing_status: 'auto_approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: EMP3.id, submitted_by: EMP3.userId, department_id: EMP3.deptId, vendor_name: 'Sydney Data Centre Hosting', transaction_date: '2026-06-20', expense_type: 'utilities', total_amount: 375.0, total_amount_aud: 375.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'unmatched', source_type: 'staff_request' },
];

// ---------------------------------------------------------------------------
// JUNE 2026 anomalies — separate batch (extra keys)
// ---------------------------------------------------------------------------
const juneAnomalyRows = [
  { employee_id: EMP1.id, submitted_by: EMP1.userId, department_id: EMP1.deptId, vendor_name: 'Meta Business Ads', transaction_date: '2026-06-22', expense_type: 'other', total_amount: 1800.0, total_amount_aud: 1800.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'price_spike', match_status: 'variance_flagged', matched_variance_amount: 200.0, matched_notes: 'Receipt AUD 2000 vs logged AUD 1800', source_type: 'direct_payment' },
];

console.log('\n--- Inserting production seed data ---');
await insertBatch('May 2026 (previous month baseline)', mayRows);
await insertBatch('June 2026 normal rows', juneRows);
await insertBatch('June 2026 anomaly rows', juneAnomalyRows);

console.log('\n--- Post-seed production entry counts ---');
await countEntries('2026-05-01', '2026-05-31');
await countEntries('2026-06-01', '2026-06-30');
console.log('\nDone. Re-trigger the n8n workflow to generate the updated report.');
