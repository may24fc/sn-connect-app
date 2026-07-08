import fs from 'fs';

const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
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

// PostgREST requires all rows in a batch to have identical keys.
// Rows with matched_variance_amount/matched_notes go in a separate batch.
const normalRows = [
  { employee_id: '94d27799-d885-43ff-b255-133b035e7d31', submitted_by: 'b8b19810-e60a-4cfa-83b2-c653f80faf99', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'Adobe Creative Cloud', transaction_date: '2026-06-03', expense_type: 'software', total_amount: 89.99, total_amount_aud: 89.99, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: 'be4c5c4d-e6cb-43d5-9163-c8c97dc0b973', submitted_by: 'b00e0e1f-3b30-4643-9783-c25f2094e26f', department_id: '9d9bf53d-1ee3-4379-9dc8-3c72fb37c6e3', vendor_name: 'Canva Pro', transaction_date: '2026-06-05', expense_type: 'software', total_amount: 149.0, total_amount_aud: 149.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: '6c40c2dd-dd91-42e8-923d-62ab691b85e6', submitted_by: '23e32872-2cc0-4f48-8745-1ffd39c69c66', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'Qantas Business', transaction_date: '2026-06-10', expense_type: 'travel', total_amount: 820.5, total_amount_aud: 820.5, currency: 'AUD', processing_status: 'approved', risk_bucket: 'price_spike', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: '94d27799-d885-43ff-b255-133b035e7d31', submitted_by: 'b8b19810-e60a-4cfa-83b2-c653f80faf99', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'Friday Lunch Debrief', transaction_date: '2026-06-12', expense_type: 'meals', total_amount: 210.0, total_amount_aud: 210.0, currency: 'AUD', processing_status: 'auto_approved', risk_bucket: 'non_recurring', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: 'be4c5c4d-e6cb-43d5-9163-c8c97dc0b973', submitted_by: 'b00e0e1f-3b30-4643-9783-c25f2094e26f', department_id: '9d9bf53d-1ee3-4379-9dc8-3c72fb37c6e3', vendor_name: 'IKEA Office Chairs x4', transaction_date: '2026-06-14', expense_type: 'office_supplies', total_amount: 640.0, total_amount_aud: 640.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'non_recurring', match_status: 'resolved', source_type: 'direct_payment' },
  { employee_id: '6c40c2dd-dd91-42e8-923d-62ab691b85e6', submitted_by: '23e32872-2cc0-4f48-8745-1ffd39c69c66', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'Xero Accounting', transaction_date: '2026-06-16', expense_type: 'software', total_amount: 129.0, total_amount_aud: 129.0, currency: 'AUD', processing_status: 'auto_approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: '94d27799-d885-43ff-b255-133b035e7d31', submitted_by: 'b8b19810-e60a-4cfa-83b2-c653f80faf99', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'Sydney Data Centre Hosting', transaction_date: '2026-06-20', expense_type: 'utilities', total_amount: 375.0, total_amount_aud: 375.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: '94d27799-d885-43ff-b255-133b035e7d31', submitted_by: 'b8b19810-e60a-4cfa-83b2-c653f80faf99', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'AWS Cloud Services', transaction_date: '2026-07-01', expense_type: 'software', total_amount: 640.0, total_amount_aud: 640.0, currency: 'AUD', processing_status: 'auto_approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: 'be4c5c4d-e6cb-43d5-9163-c8c97dc0b973', submitted_by: 'b00e0e1f-3b30-4643-9783-c25f2094e26f', department_id: '9d9bf53d-1ee3-4379-9dc8-3c72fb37c6e3', vendor_name: 'Client Dinner SALT', transaction_date: '2026-07-02', expense_type: 'meals', total_amount: 390.0, total_amount_aud: 390.0, currency: 'AUD', processing_status: 'awaiting_intern_review', risk_bucket: 'pending', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: '6c40c2dd-dd91-42e8-923d-62ab691b85e6', submitted_by: '23e32872-2cc0-4f48-8745-1ffd39c69c66', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'Uber for Business', transaction_date: '2026-07-03', expense_type: 'travel', total_amount: 175.4, total_amount_aud: 175.4, currency: 'AUD', processing_status: 'auto_approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: '94d27799-d885-43ff-b255-133b035e7d31', submitted_by: 'b8b19810-e60a-4cfa-83b2-c653f80faf99', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'MYOB Annual Subscription', transaction_date: '2026-07-03', expense_type: 'software', total_amount: 520.0, total_amount_aud: 520.0, currency: 'AUD', processing_status: 'awaiting_intern_review', risk_bucket: 'pending', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: 'be4c5c4d-e6cb-43d5-9163-c8c97dc0b973', submitted_by: 'b00e0e1f-3b30-4643-9783-c25f2094e26f', department_id: '9d9bf53d-1ee3-4379-9dc8-3c72fb37c6e3', vendor_name: 'Office Equipment Repair', transaction_date: '2026-07-04', expense_type: 'maintenance', total_amount: 310.0, total_amount_aud: 310.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'non_recurring', match_status: 'resolved', source_type: 'direct_payment' },
  { employee_id: '6c40c2dd-dd91-42e8-923d-62ab691b85e6', submitted_by: '23e32872-2cc0-4f48-8745-1ffd39c69c66', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'Google Workspace', transaction_date: '2026-07-05', expense_type: 'software', total_amount: 210.0, total_amount_aud: 210.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'matched', source_type: 'direct_payment' },
  { employee_id: '94d27799-d885-43ff-b255-133b035e7d31', submitted_by: 'b8b19810-e60a-4cfa-83b2-c653f80faf99', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'Printer Cartridges Bulk', transaction_date: '2026-07-05', expense_type: 'office_supplies', total_amount: 145.8, total_amount_aud: 145.8, currency: 'AUD', processing_status: 'auto_approved', risk_bucket: 'standard_recurring', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: '6c40c2dd-dd91-42e8-923d-62ab691b85e6', submitted_by: '23e32872-2cc0-4f48-8745-1ffd39c69c66', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'Electricity Quarter 2', transaction_date: '2026-07-06', expense_type: 'utilities', total_amount: 490.0, total_amount_aud: 490.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'standard_recurring', match_status: 'unmatched', source_type: 'staff_request' },
  { employee_id: '94d27799-d885-43ff-b255-133b035e7d31', submitted_by: 'b8b19810-e60a-4cfa-83b2-c653f80faf99', department_id: '4249aa39-6f68-40b3-8732-20823e3020e7', vendor_name: 'Conference Travel BNE', transaction_date: '2026-07-06', expense_type: 'travel', total_amount: 680.0, total_amount_aud: 680.0, currency: 'AUD', processing_status: 'draft_extracted', risk_bucket: 'pending', match_status: 'unmatched', source_type: 'staff_request' },
];

const anomalyRows = [
  { employee_id: 'be4c5c4d-e6cb-43d5-9163-c8c97dc0b973', submitted_by: 'b00e0e1f-3b30-4643-9783-c25f2094e26f', department_id: '9d9bf53d-1ee3-4379-9dc8-3c72fb37c6e3', vendor_name: 'Meta Business Ads', transaction_date: '2026-06-22', expense_type: 'other', total_amount: 1800.0, total_amount_aud: 1800.0, currency: 'AUD', processing_status: 'approved', risk_bucket: 'price_spike', match_status: 'variance_flagged', matched_variance_amount: 200.0, matched_notes: 'Receipt AUD 2000 vs logged AUD 1800', source_type: 'direct_payment' },
  { employee_id: 'be4c5c4d-e6cb-43d5-9163-c8c97dc0b973', submitted_by: 'b00e0e1f-3b30-4643-9783-c25f2094e26f', department_id: '9d9bf53d-1ee3-4379-9dc8-3c72fb37c6e3', vendor_name: 'LinkedIn Ads Campaign', transaction_date: '2026-07-06', expense_type: 'other', total_amount: 2400.0, total_amount_aud: 2400.0, currency: 'AUD', processing_status: 'awaiting_intern_review', risk_bucket: 'price_spike', match_status: 'variance_flagged', matched_variance_amount: 350.0, matched_notes: 'Receipt AUD 2750 vs logged AUD 2400', source_type: 'direct_payment' },
];

const reqHeaders = { apikey: srk, Authorization: 'Bearer ' + srk, 'Content-Type': 'application/json', Prefer: 'return=minimal' };

async function insertBatch(label, rows) {
  const r = await fetch(url + '/rest/v1/expense_entries', { method: 'POST', headers: reqHeaders, body: JSON.stringify(rows) });
  const body = await r.text();
  if (r.ok) {
    console.log(`✓ ${label}: ${rows.length} rows inserted (HTTP ${r.status})`);
  } else {
    console.error(`✗ ${label}: HTTP ${r.status} — ${body.slice(0, 400)}`);
  }
}

await insertBatch('Normal rows', normalRows);
await insertBatch('Anomaly rows', anomalyRows);
console.log('Seeding complete.');
