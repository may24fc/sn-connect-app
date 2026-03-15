// Usage: node scripts/register-drive-watch.mjs <GOOGLE_DRIVE_FILE_ID>
// Env vars required: WEBHOOK_BASE_URL, GOOGLE_SERVICE_ACCOUNT_EMAIL,
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_WEBHOOK_TOKEN

import { google } from 'googleapis';
import { randomUUID } from 'node:crypto';

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
