import { google } from 'googleapis';
import { type NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const GOOGLE_DOCS_MIME_TYPE = 'application/vnd.google-apps.document';

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

function getSearchParam(request: NextRequest, key: string): string | null {
  return request.nextUrl?.searchParams.get(key) ?? new URL(request.url).searchParams.get(key);
}

function isTruthy(value: string | null): boolean {
  return value === '1' || value === 'true';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStoredModifiedTime(metadata: unknown): string | null {
  if (!isRecord(metadata)) {
    return null;
  }

  const value = metadata.google_drive_modified_time;
  return typeof value === 'string' && value.length > 0 ? value : null;
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fileIds = parseWatchFileIds(process.env.GOOGLE_DRIVE_WATCH_FILE_IDS);
  if (fileIds.length === 0) {
    return NextResponse.json(
      { error: 'Missing GOOGLE_DRIVE_WATCH_FILE_IDS in environment.' },
      { status: 500 },
    );
  }

  const force = isTruthy(getSearchParam(request, 'force'));

  try {
    const drive = createDriveClient();
    const supabase = createSupabaseAdminClient();
    const results: Array<{
      fileId: string;
      title?: string;
      modifiedTime?: string | null;
      action: 'queued' | 'skipped';
      reason: 'missing_source' | 'outdated_source' | 'up_to_date' | 'already_indexing' | 'forced' | 'unsupported_mime_type';
    }> = [];

    for (const fileId of fileIds) {
      const meta = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,modifiedTime',
      });

      const mimeType = meta.data.mimeType ?? '';
      const modifiedTime = meta.data.modifiedTime ?? null;
      const title = meta.data.name ?? `Google Doc ${fileId}`;

      if (mimeType !== GOOGLE_DOCS_MIME_TYPE) {
        results.push({
          fileId,
          title,
          modifiedTime,
          action: 'skipped',
          reason: 'unsupported_mime_type',
        });
        continue;
      }

      const { data: existingSource } = await supabase
        .from('knowledge_sources')
        .select('id, metadata, processing_status')
        .eq('metadata->>google_drive_file_id', fileId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!force && existingSource?.processing_status === 'indexing') {
        results.push({
          fileId,
          title,
          modifiedTime,
          action: 'skipped',
          reason: 'already_indexing',
        });
        continue;
      }

      const storedModifiedTime = getStoredModifiedTime(existingSource?.metadata);
      const shouldQueue =
        force || !existingSource || !storedModifiedTime || storedModifiedTime !== modifiedTime;

      if (!shouldQueue) {
        results.push({
          fileId,
          title,
          modifiedTime,
          action: 'skipped',
          reason: 'up_to_date',
        });
        continue;
      }

      await inngest.send({
        name: 'drive/document.updated',
        data: {
          fileId,
          resourceId: `cron:${fileId}:${modifiedTime ?? 'unknown'}`,
          resourceState: force ? 'force_sync' : 'poll',
          channelId: 'cron',
          timestamp: new Date().toISOString(),
        },
      });

      results.push({
        fileId,
        title,
        modifiedTime,
        action: 'queued',
        reason: force ? 'forced' : existingSource ? 'outdated_source' : 'missing_source',
      });
    }

    const queuedCount = results.filter((result) => result.action === 'queued').length;
    const skippedCount = results.length - queuedCount;

    return NextResponse.json({
      ok: true,
      force,
      docsChecked: results.length,
      queuedCount,
      skippedCount,
      results,
    });
  } catch (error) {
    console.error('[cron/drive-doc-sync] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}