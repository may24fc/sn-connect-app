import { type NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

export const runtime = 'nodejs';

const WEBHOOK_TOKEN = process.env.GOOGLE_DRIVE_WEBHOOK_TOKEN ?? '';

function extractFileId(resourceUri: string | null): string | null {
  if (!resourceUri) return null;
  const match = /\/files\/([A-Za-z0-9_-]+)/.exec(resourceUri);
  return match?.[1] ?? null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const channelToken = request.headers.get('x-goog-channel-token');
  if (!WEBHOOK_TOKEN || channelToken !== WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const resourceState = request.headers.get('x-goog-resource-state');
  const resourceId = request.headers.get('x-goog-resource-id');
  const channelId = request.headers.get('x-goog-channel-id');
  const resourceUri = request.headers.get('x-goog-resource-uri');

  if (resourceState === 'sync') {
    return NextResponse.json({ status: 'sync_ack' });
  }

  if (!resourceState || !['update', 'change'].includes(resourceState)) {
    return NextResponse.json({ status: 'ignored' });
  }

  const fileId = extractFileId(resourceUri);
  if (!fileId || !resourceId) {
    return NextResponse.json({ error: 'Missing file identifier' }, { status: 400 });
  }

  await inngest.send({
    name: 'drive/document.updated',
    data: {
      fileId,
      resourceId,
      resourceState,
      channelId: channelId ?? '',
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json({ status: 'queued' });
}
