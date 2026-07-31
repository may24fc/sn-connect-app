import fs from 'fs';

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
const h = { apikey: srk, Authorization: 'Bearer ' + srk };

// Get real employees from production
const empR = await fetch(url + '/rest/v1/employees?select=id,user_id,department,deleted_at&deleted_at=is.null&limit=15', { headers: h });
const emps = await empR.json();
console.log('Production employees:');
for (const e of emps) console.log(` id=${e.id}  user_id=${e.user_id}  dept=${e.department}`);

// Get real departments from production
const deptR = await fetch(url + '/rest/v1/departments?select=id,name&deleted_at=is.null&limit=10', { headers: h });
const depts = await deptR.json();
console.log('\nProduction departments:');
for (const d of depts) console.log(` id=${d.id}  name=${d.name}`);
