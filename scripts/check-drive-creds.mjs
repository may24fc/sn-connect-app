import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../apps/web/.env.local');
const lines = readFileSync(envPath, 'utf8').split('\n');
for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  let raw = t.slice(eq + 1).trim();
  let v;
  if (raw.startsWith('"') || raw.startsWith("'")) {
    const quote = raw[0];
    const closeIdx = raw.indexOf(quote, 1);
    v = closeIdx !== -1 ? raw.slice(1, closeIdx) : raw.slice(1);
  } else {
    const commentIdx = raw.search(/ #/);
    v = commentIdx !== -1 ? raw.slice(0, commentIdx).trim() : raw.trim();
  }
  process.env[k] = v;
}

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
const key = rawKey?.replace(/\\n/g, '\n');

console.log('Email        :', email);
console.log('Key first 35 :', key?.slice(0, 35));
console.log('Key last 30  :', key?.slice(-30).trim());
console.log('Key length   :', key?.length);
console.log('Has BEGIN    :', key?.includes('BEGIN PRIVATE KEY'));
console.log('Has END      :', key?.includes('END PRIVATE KEY'));
