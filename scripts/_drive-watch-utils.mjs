import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { google } from 'googleapis';

export const FILES_WATCH_MAX_HOURS = 24;

export function loadWebEnv() {
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

      if (raw.startsWith('"') || raw.startsWith("'")) {
        const quote = raw[0];
        const closingIdx = raw.indexOf(quote, 1);
        value = closingIdx !== -1 ? raw.slice(1, closingIdx) : raw.slice(1);
      } else {
        const commentIdx = raw.search(/ #/);
        value = commentIdx !== -1 ? raw.slice(0, commentIdx).trim() : raw.trim();
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not found — rely on shell env vars.
  }
}

export function resolveExpirationHours(rawValue) {
  const requestedHours = Number(rawValue ?? String(FILES_WATCH_MAX_HOURS));
  if (!Number.isFinite(requestedHours) || requestedHours <= 0) {
    return FILES_WATCH_MAX_HOURS;
  }

  return Math.min(requestedHours, FILES_WATCH_MAX_HOURS);
}

export function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

export function getWebhookAddress() {
  const baseUrl = process.env.WEBHOOK_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error('Missing WEBHOOK_BASE_URL. Google Drive watches require a public HTTPS webhook URL.');
  }

  if (!baseUrl.startsWith('https://')) {
    throw new Error(
      `Invalid WEBHOOK_BASE_URL: ${baseUrl}. Google Drive watches require a public HTTPS webhook URL.`
    );
  }

  return `${baseUrl}/api/webhooks/drive`;
}

export async function registerFileWatch({ drive, fileId, expirationHours }) {
  const channelId = `drive-watch-${fileId}-${randomUUID().slice(0, 8)}`;
  const expirationMs = expirationHours * 60 * 60 * 1000;
  const address = getWebhookAddress();

  const response = await drive.files.watch({
    fileId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address,
      token: process.env.GOOGLE_DRIVE_WEBHOOK_TOKEN,
      expiration: String(Date.now() + expirationMs),
    },
  });

  return {
    channelId: response.data.id,
    resourceId: response.data.resourceId,
    expiration: new Date(Number(response.data.expiration)).toISOString(),
  };
}

export function parseWatchFileIds(argv) {
  const explicitIds = argv.filter((value) => !value.startsWith('--'));
  if (explicitIds.length > 0) {
    return explicitIds;
  }

  const envValue = process.env.GOOGLE_DRIVE_WATCH_FILE_IDS ?? '';
  return envValue
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}
