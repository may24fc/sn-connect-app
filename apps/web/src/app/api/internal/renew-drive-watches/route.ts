import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const FILES_WATCH_MAX_HOURS = 24;

function getAuthorizedSecret(): string | null {
  return process.env.GOOGLE_DRIVE_WATCH_RENEW_SECRET ?? process.env.CRON_SECRET ?? null;
}

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = getAuthorizedSecret();
  if (!configuredSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${configuredSecret}`;
}

function getConfiguredFileIds(): string[] {
  return (process.env.GOOGLE_DRIVE_WATCH_FILE_IDS ?? '')
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function getExpirationHours(request: NextRequest): number {
  const raw = request.nextUrl?.searchParams.get('hours') ?? new URL(request.url).searchParams.get('hours') ?? '24';
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return FILES_WATCH_MAX_HOURS;
  }

  return Math.min(parsed, FILES_WATCH_MAX_HOURS);
}

function getWebhookAddress(): string {
  const baseUrl = process.env.WEBHOOK_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error('Missing WEBHOOK_BASE_URL');
  }

  if (!baseUrl.startsWith('https://')) {
    throw new Error('WEBHOOK_BASE_URL must be HTTPS for Google Drive push notifications');
  }

  return `${baseUrl}/api/webhooks/drive`;
}

function getWebhookToken(): string {
  const token = process.env.GOOGLE_DRIVE_WEBHOOK_TOKEN?.trim();

  if (!token) {
    throw new Error('Missing GOOGLE_DRIVE_WEBHOOK_TOKEN');
  }

  return token;
}

function getDriveClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google service account credentials');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

async function renewWatches(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fileIds = getConfiguredFileIds();
  if (fileIds.length === 0) {
    return NextResponse.json({ error: 'No GOOGLE_DRIVE_WATCH_FILE_IDS configured' }, { status: 400 });
  }

  const expirationHours = getExpirationHours(request);
  const expirationMs = expirationHours * 60 * 60 * 1000;
  const address = getWebhookAddress();
  const webhookToken = getWebhookToken();
  const drive = getDriveClient();

  const results = [] as Array<{
    fileId: string;
    channelId: string | null | undefined;
    resourceId: string | null | undefined;
    expiration: string;
  }>;

  for (const fileId of fileIds) {
    const channelId = `drive-watch-${fileId}-${crypto.randomUUID().slice(0, 8)}`;
    const response = await drive.files.watch({
      fileId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address,
        token: webhookToken,
        expiration: String(Date.now() + expirationMs),
      },
    });

    results.push({
      fileId,
      channelId: response.data.id,
      resourceId: response.data.resourceId,
      expiration: new Date(Number(response.data.expiration)).toISOString(),
    });
  }

  return NextResponse.json({
    watchesRegistered: results.length,
    expirationHours,
    maxSupportedHours: FILES_WATCH_MAX_HOURS,
    results,
  });
}

export async function GET(request: NextRequest) {
  try {
    return await renewWatches(request);
  } catch (error) {
    console.error('Failed to renew Google Drive watches:', error);
    return NextResponse.json({ error: 'Failed to renew Google Drive watches' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await renewWatches(request);
  } catch (error) {
    console.error('Failed to renew Google Drive watches:', error);
    return NextResponse.json({ error: 'Failed to renew Google Drive watches' }, { status: 500 });
  }
}