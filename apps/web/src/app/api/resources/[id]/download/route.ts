import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('id, file_path, external_url, download_count, access_level')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Block downloads for view-only resources
    if (resource.access_level === 'view_only') {
      return NextResponse.json(
        { error: 'This resource is view-only and cannot be downloaded' },
        { status: 403 }
      );
    }

    if (resource.external_url) {
      return NextResponse.json({ data: { url: resource.external_url } });
    }

    if (!resource.file_path) {
      return NextResponse.json({ error: 'No downloadable file available' }, { status: 400 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('resources-library')
      .createSignedUrl(resource.file_path, 60 * 15);

    if (signError || !signed) {
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    // Use the database function to increment download count
    await supabase.rpc('increment_resource_download_count', { resource_uuid: id });

    return NextResponse.json({ data: { url: signed.signedUrl } });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/[id]/download:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
