// Usage: node scripts/register-drive-watch.mjs <GOOGLE_DRIVE_FILE_ID>
// Env vars required: WEBHOOK_BASE_URL, GOOGLE_SERVICE_ACCOUNT_EMAIL,
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_WEBHOOK_TOKEN
// Loads automatically from apps/web/.env.local (no --env-file flag needed).

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import { randomUUID } from 'node:crypto';

// Load apps/web/.env.local so this script works with plain `node` (no Next.js)
try {
  const __dir = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(__dir, '../apps/web/.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let raw = trimmed.slice(eqIdx + 1).trim();
    let value;
    // If value is quoted, extract only the content between the matching quotes
    // (ignoring any inline # comment that follows the closing quote)
    if (raw.startsWith('"') || raw.startsWith("'")) {
      const quote = raw[0];
      const closingIdx = raw.indexOf(quote, 1);
      value = closingIdx !== -1 ? raw.slice(1, closingIdx) : raw.slice(1);
    } else {
      // Unquoted: strip inline comment (first unescaped ' #')
      const commentIdx = raw.search(/ #/);
      value = commentIdx !== -1 ? raw.slice(0, commentIdx).trim() : raw.trim();
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // .env.local not found — rely on env vars already set in the shell
}

const fileId = process.argv[2];
if (!fileId) {
  console.error('Usage: node scripts/register-drive-watch.mjs <FILE_ID>');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
      /\\n/g,
      '\n',
    ),
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

const channelId = `drive-watch-${fileId}-${randomUUID().slice(0, 8)}`;

const res = await drive.files.watch({
  fileId,
  requestBody: {
    id: channelId,
    type: 'web_hook',
    address: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/drive`,
    token: process.env.GOOGLE_DRIVE_WEBHOOK_TOKEN,
    expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});

console.log('Watch registered:', {
  channelId: res.data.id,
  resourceId: res.data.resourceId,
  expiration: new Date(Number(res.data.expiration)).toISOString(),
});
