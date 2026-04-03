import { randomUUID } from 'node:crypto';
import { google } from 'googleapis';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const FILES_WATCH_MAX_HOURS = 24;
const DEFAULT_RENEWAL_HOURS = 12;

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader === '1') {
    return true;
  }

  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!configuredSecret || !authHeader) {
    return false;
  }

  return authHeader === `Bearer ${configuredSecret}`;
}

function parseWatchFileIds(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }

  return [...new Set(rawValue.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))];
}

function resolveExpirationHours(rawValue: string | null): number {
  const requestedHours = Number(rawValue ?? String(DEFAULT_RENEWAL_HOURS));
  if (!Number.isFinite(requestedHours) || requestedHours <= 0) {
    return DEFAULT_RENEWAL_HOURS;
  }

  return Math.min(requestedHours, FILES_WATCH_MAX_HOURS);
}

function resolveWebhookBaseUrl(): string {
  const candidates = [
    process.env.WEBHOOK_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
  ];

  for (const candidate of candidates) {
    const normalized = candidate?.trim().replace(/\/$/, '');
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function createDriveClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
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

async function registerFileWatch({
  drive,
  fileId,
  expirationHours,
  webhookBaseUrl,
  webhookToken,
}: {
  drive: ReturnType<typeof google.drive>;
  fileId: string;
  expirationHours: number;
  webhookBaseUrl: string;
  webhookToken: string;
}): Promise<{ channelId: string | null; resourceId: string | null; expiration: string | null }> {
  const channelId = `drive-watch-${fileId}-${randomUUID().slice(0, 8)}`;
  const expirationMs = expirationHours * 60 * 60 * 1000;

  const response = await drive.files.watch({
    fileId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: `${webhookBaseUrl}/api/webhooks/drive`,
      token: webhookToken,
      expiration: String(Date.now() + expirationMs),
    },
  });

  return {
    channelId: response.data.id ?? null,
    resourceId: response.data.resourceId ?? null,
    expiration: response.data.expiration
      ? new Date(Number(response.data.expiration)).toISOString()
      : null,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fileIds = parseWatchFileIds(process.env.GOOGLE_DRIVE_WATCH_FILE_IDS);
  const webhookToken = process.env.GOOGLE_DRIVE_WEBHOOK_TOKEN ?? '';
  const webhookBaseUrl = resolveWebhookBaseUrl();
  const expirationHours = resolveExpirationHours(request.nextUrl.searchParams.get('hours'));

  if (fileIds.length === 0) {
    return NextResponse.json(
      { error: 'Missing GOOGLE_DRIVE_WATCH_FILE_IDS in environment.' },
      { status: 500 }
    );
  }

  if (!webhookToken) {
    return NextResponse.json(
      { error: 'Missing GOOGLE_DRIVE_WEBHOOK_TOKEN in environment.' },
      { status: 500 }
    );
  }

  if (!webhookBaseUrl) {
    return NextResponse.json(
      {
        error:
          'Missing webhook base URL. Set WEBHOOK_BASE_URL, NEXT_PUBLIC_SITE_URL, or APP_URL.',
      },
      { status: 500 }
    );
  }

  try {
    const drive = createDriveClient();
    const results: Array<{
      fileId: string;
      ok: boolean;
      channelId?: string | null;
      resourceId?: string | null;
      expiration?: string | null;
      error?: string;
    }> = [];

    for (const fileId of fileIds) {
      try {
        const watch = await registerFileWatch({
          drive,
          fileId,
          expirationHours,
          webhookBaseUrl,
          webhookToken,
        });

        results.push({
          fileId,
          ok: true,
          channelId: watch.channelId,
          resourceId: watch.resourceId,
          expiration: watch.expiration,
        });
      } catch (error) {
        results.push({
          fileId,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((result) => result.ok).length;
    const failureCount = results.length - successCount;
    const status = failureCount === 0 ? 200 : successCount > 0 ? 207 : 502;

    return NextResponse.json(
      {
        ok: failureCount === 0,
        watchesRequested: fileIds.length,
        successCount,
        failureCount,
        expirationHours,
        webhookBaseUrl,
        results,
      },
      { status }
    );
  } catch (error) {
    console.error('[cron/drive-watch-renew] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}