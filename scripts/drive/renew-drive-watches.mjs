// Usage:
//   node scripts/drive/renew-drive-watches.mjs <FILE_ID> [FILE_ID ...] [--hours=24]
//   node scripts/drive/renew-drive-watches.mjs --hours=24
// When no file IDs are passed, the script reads GOOGLE_DRIVE_WATCH_FILE_IDS
// from apps/web/.env.local and expects a comma- or space-separated list.

import {
  FILES_WATCH_MAX_HOURS,
  getDriveClient,
  loadWebEnv,
  parseWatchFileIds,
  registerFileWatch,
  resolveExpirationHours,
} from './_drive-watch-utils.mjs';

loadWebEnv();

const hoursArg = process.argv.slice(2).find((value) => value.startsWith('--hours='));
const expirationHours = resolveExpirationHours(hoursArg?.split('=')[1]);
const fileIds = parseWatchFileIds(process.argv.slice(2));

if (fileIds.length === 0) {
  console.error(
    'Usage: node scripts/drive/renew-drive-watches.mjs <FILE_ID> [FILE_ID ...] [--hours=24]\n' +
      'Or set GOOGLE_DRIVE_WATCH_FILE_IDS in apps/web/.env.local.'
  );
  process.exit(1);
}

const drive = getDriveClient();
const results = [];

for (const fileId of fileIds) {
  const watch = await registerFileWatch({ drive, fileId, expirationHours });
  results.push({ fileId, ...watch });
}

console.log(
  JSON.stringify(
    {
      watchesRegistered: results.length,
      expirationHours,
      maxSupportedHours: FILES_WATCH_MAX_HOURS,
      results,
    },
    null,
    2,
  ),
);
