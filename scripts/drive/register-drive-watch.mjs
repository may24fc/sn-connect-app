// Usage: node scripts/drive/register-drive-watch.mjs <GOOGLE_DRIVE_FILE_ID> [EXPIRATION_HOURS]
// Env vars required: WEBHOOK_BASE_URL, GOOGLE_SERVICE_ACCOUNT_EMAIL,
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_WEBHOOK_TOKEN
// Loads automatically from apps/web/.env.local (no --env-file flag needed).

import {
  FILES_WATCH_MAX_HOURS,
  getDriveClient,
  loadWebEnv,
  registerFileWatch,
  resolveExpirationHours,
} from './_drive-watch-utils.mjs';

loadWebEnv();

const fileId = process.argv[2];
const requestedHours = process.argv[3];
if (!fileId) {
  console.error('Usage: node scripts/drive/register-drive-watch.mjs <FILE_ID> [EXPIRATION_HOURS]');
  process.exit(1);
}

const expirationHours = resolveExpirationHours(requestedHours);
const drive = getDriveClient();
const result = await registerFileWatch({ drive, fileId, expirationHours });

console.log('Watch registered:', result);

if (Number(requestedHours) > FILES_WATCH_MAX_HOURS) {
  console.log(
    `Note: Google Drive files.watch channels are capped at ${FILES_WATCH_MAX_HOURS} hours, so the requested expiration was clamped.`
  );
}

