import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/resources/[id]/stream
 *
 * Generates a short-lived signed URL for video streaming.
 * - For `view_only` resources: 5-minute expiry, Content-Disposition: inline
 * - For `full` access resources: 15-minute expiry, standard signed URL
 *
 * Does NOT increment download count (streaming is not downloading).
 */
export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('id, file_path, external_url, access_level')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // External URLs (YouTube, Vimeo) are returned directly — no signed URL needed
    if (resource.external_url) {
      return NextResponse.json({
        data: {
          url: resource.external_url,
          accessLevel: resource.access_level ?? 'full',
          isExternal: true,
        },
      });
    }

    if (!resource.file_path) {
      return NextResponse.json({ error: 'No streamable file available' }, { status: 400 });
    }

    const isViewOnly = resource.access_level === 'view_only';

    // View-only: 5-minute expiry; Full access: 15-minute expiry
    const expirySeconds = isViewOnly ? 60 * 5 : 60 * 15;

    const { data: signed, error: signError } = await supabase.storage
      .from('resources-library')
      .createSignedUrl(resource.file_path, expirySeconds, {
        download: false, // Inline display, not download
      });

    if (signError || !signed) {
      return NextResponse.json({ error: 'Failed to generate stream URL' }, { status: 500 });
    }

    const headers: Record<string, string> = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    };

    if (isViewOnly) {
      headers['Content-Disposition'] = 'inline';
    }

    return NextResponse.json(
      {
        data: {
          url: signed.signedUrl,
          accessLevel: resource.access_level ?? 'full',
          isExternal: false,
          expiresInSeconds: expirySeconds,
        },
      },
      { headers }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/[id]/stream:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
