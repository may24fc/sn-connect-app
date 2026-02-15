import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../../../announcements/_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('id, file_path, external_url, downloads_count')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    if (resource.external_url) {
      return NextResponse.json({ data: { url: resource.external_url } });
    }

    if (!resource.file_path) {
      return NextResponse.json({ error: 'No downloadable file available' }, { status: 400 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('announcement-attachments')
      .createSignedUrl(resource.file_path, 60 * 15);

    if (signError || !signed) {
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    await supabase
      .from('resources')
      .update({ downloads_count: (resource.downloads_count || 0) + 1 })
      .eq('id', id)
      .is('deleted_at', null);

    return NextResponse.json({ data: { url: signed.signedUrl } });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/[id]/download:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
