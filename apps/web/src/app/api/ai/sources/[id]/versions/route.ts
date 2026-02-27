import { type NextRequest, NextResponse } from 'next/server';
import { getAdminClient, getAuthedSupabase, isAiAdmin } from '../../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/ai/sources/[id]/versions
 * Returns version history for a knowledge source.
 */
export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = getAdminClient();

    // Verify source exists
    const { data: source, error: sourceError } = await adminClient
      .from('knowledge_sources')
      .select('id, title, current_version')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (sourceError || !source) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }

    // Fetch version history with editor names
    const { data: versions, error: versionsError } = await adminClient
      .from('knowledge_source_versions')
      .select(`
        id,
        version_number,
        title,
        content,
        changed_by,
        change_summary,
        metadata,
        created_at
      `)
      .eq('source_id', id)
      .order('version_number', { ascending: false });

    if (versionsError) {
      console.error('Error fetching knowledge source versions:', versionsError);
      return NextResponse.json({ error: 'Failed to fetch version history' }, { status: 500 });
    }

    // Enrich with editor names
    const editorIds = [...new Set((versions || []).map((v) => v.changed_by).filter(Boolean))];
    let editorMap = new Map<string, string>();

    if (editorIds.length > 0) {
      const { data: editors } = await adminClient
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', editorIds)
        .is('deleted_at', null);

      if (editors) {
        editorMap = new Map(
          editors.map((e) => [
            e.user_id,
            `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Unknown',
          ])
        );
      }

      // Fallback to email for editors without employee records
      const missingIds = editorIds.filter((id) => !editorMap.has(id));
      if (missingIds.length > 0) {
        const { data: users } = await adminClient
          .from('users')
          .select('id, email')
          .in('id', missingIds);

        if (users) {
          for (const u of users) {
            if (!editorMap.has(u.id)) {
              editorMap.set(u.id, u.email || 'Unknown');
            }
          }
        }
      }
    }

    const enrichedVersions = (versions || []).map((v) => ({
      ...v,
      changed_by_name: v.changed_by ? editorMap.get(v.changed_by) || 'Unknown' : 'System',
    }));

    return NextResponse.json({
      data: {
        source: {
          id: source.id,
          title: source.title,
          current_version: source.current_version,
        },
        versions: enrichedVersions,
      },
    });
  } catch (err) {
    console.error('Unexpected error in GET /api/ai/sources/[id]/versions:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/ai/sources/[id]/versions
 * Restore a previous version of a knowledge source.
 * Body: { versionNumber: number }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const versionNumber = body?.versionNumber;

    if (typeof versionNumber !== 'number' || versionNumber < 1) {
      return NextResponse.json(
        { error: 'Invalid version number' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    // Get the version to restore
    const { data: version, error: versionError } = await adminClient
      .from('knowledge_source_versions')
      .select('*')
      .eq('source_id', id)
      .eq('version_number', versionNumber)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Update the knowledge source with the version's content
    // The DB trigger will automatically snapshot the current state
    const { data: updated, error: updateError } = await adminClient
      .from('knowledge_sources')
      .update({
        title: version.title,
        content: version.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('Error restoring knowledge source version:', updateError);
      return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'restore_knowledge_source_version',
      resource_type: 'knowledge_source',
      resource_id: id,
      details: {
        restored_version: versionNumber,
        new_version: updated.current_version,
      },
    });

    // Clear stale embeddings since content changed
    await adminClient.from('knowledge_embeddings').delete().eq('source_id', id);

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('Unexpected error in POST /api/ai/sources/[id]/versions:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
