import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { buildMuxPlaybackUrls } from '@/lib/mux/server';

interface MuxWebhookPayload {
  type?: string;
  data?: {
    id?: string;
    upload_id?: string;
    duration?: number;
    playback_ids?: Array<{
      id?: string;
      policy?: string;
    }>;
  };
}

type MuxPlaybackIdEntry = {
  id?: string;
  policy?: string;
};

function getPlaybackId(playbackIds?: Array<MuxPlaybackIdEntry>): string | null {
  if (!playbackIds || playbackIds.length === 0) return null;
  const preferred = playbackIds.find((entry) => entry.policy === 'public' && entry.id);
  return preferred?.id ?? playbackIds[0]?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.MUX_WEBHOOK_TOKEN?.trim();
    if (expectedToken) {
      const actualToken = request.nextUrl.searchParams.get('token')?.trim();
      if (!actualToken || actualToken !== expectedToken) {
        return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
      }
    }

    const payload = (await request.json()) as MuxWebhookPayload;

    if (payload.type !== 'video.asset.ready') {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const uploadId = payload.data?.upload_id ?? null;
    const playbackId = getPlaybackId(payload.data?.playback_ids);

    if (!uploadId || !playbackId) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'missing_upload_or_playback' });
    }

    const { streamUrl, thumbnailUrl } = buildMuxPlaybackUrls(playbackId);
    const adminClient = createSupabaseAdminClient();

    const updatePayload: Record<string, unknown> = {
      external_url: streamUrl,
      thumbnail_path: thumbnailUrl,
      updated_at: new Date().toISOString(),
    };

    if (typeof payload.data?.duration === 'number' && Number.isFinite(payload.data.duration)) {
      updatePayload.duration_seconds = Math.round(payload.data.duration);
    }

    const { error } = await adminClient
      .from('resources')
      .update(updatePayload)
      .eq('file_path', `mux-upload:${uploadId}`)
      .is('deleted_at', null);

    if (error) {
      console.error('Mux webhook resource update failed:', error);
      return NextResponse.json({ error: 'Failed to update resource from webhook' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources/mux/webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
