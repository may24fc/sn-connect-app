import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { getProjectAuthedContext, isProjectAdmin, userCanAccessProject } from '../../_lib';

const PROJECT_DOCUMENTATION_BUCKET = 'project-documentations';
const SIGNED_URL_TTL_SECONDS = 60 * 10;

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ProjectDocumentationRow {
  id: string;
  project_id: string;
  submitted_by: string;
  documentation_type: 'link' | 'file';
  content: string;
  label: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function getSubmittedByNames(supabaseAdmin: any, userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds)
    .is('deleted_at', null);

  const names = new Map<string, string>();
  for (const employee of employees ?? []) {
    names.set(employee.user_id, `${employee.first_name} ${employee.last_name}`);
  }

  return names;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const auth = await getProjectAuthedContext();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { supabaseAdmin, user, role } = auth.context;
    const allowed = await userCanAccessProject(supabaseAdmin, projectId, user.id, role);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('project_documentations')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch project documentation' }, { status: 500 });
    }

    const documentation = (data ?? []) as Array<ProjectDocumentationRow>;
    const submittedByNames = await getSubmittedByNames(
      supabaseAdmin,
      Array.from(new Set(documentation.map((item) => item.submitted_by)))
    );

    const enriched = await Promise.all(
      documentation.map(async (item) => {
        let signedUrl: string | null = null;
        if (item.documentation_type === 'file') {
          const { data: signed, error: signedError } = await supabaseAdmin.storage
            .from(PROJECT_DOCUMENTATION_BUCKET)
            .createSignedUrl(item.content, SIGNED_URL_TTL_SECONDS);
          if (!signedError) {
            signedUrl = signed?.signedUrl ?? null;
          }
        }

        return {
          ...item,
          submitted_by_name: submittedByNames.get(item.submitted_by) ?? 'Unknown',
          access_url: item.documentation_type === 'link' ? item.content : signedUrl,
        };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error('Unexpected error in GET /api/projects/[id]/documentation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const auth = await getProjectAuthedContext();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { supabaseAdmin, supabase, user, role } = auth.context;
    const allowed = await userCanAccessProject(supabaseAdmin, projectId, user.id, role);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const label = String(formData.get('label') || '').trim() || null;
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'File is required' }, { status: 400 });
      }

      const safeName = sanitizeFileName(file.name);
      const filePath = `${projectId}/${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(PROJECT_DOCUMENTATION_BUCKET)
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) {
        return NextResponse.json({ error: 'Failed to upload documentation file' }, { status: 500 });
      }

      const { data: created, error: insertError } = await supabaseAdmin
        .from('project_documentations')
        .insert({
          project_id: projectId,
          submitted_by: user.id,
          documentation_type: 'file',
          content: filePath,
          label,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
        })
        .select('*')
        .single();

      if (insertError || !created) {
        await supabaseAdmin.storage.from(PROJECT_DOCUMENTATION_BUCKET).remove([filePath]);
        return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 });
      }

      logActivity(supabase, {
        userId: user.id,
        action: 'create_project_documentation',
        tableName: 'project_documentations',
        recordId: created.id,
        metadata: { projectId, documentationType: 'file' },
      });

      return NextResponse.json({ data: created }, { status: 201 });
    }

    const payload = (await request.json().catch(() => null)) as
      | { documentationType?: string; content?: string; label?: string | null }
      | null;

    const documentationType = payload?.documentationType;
    const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
    const label = typeof payload?.label === 'string' ? payload.label.trim() || null : null;

    if (documentationType !== 'link') {
      return NextResponse.json({ error: 'Only link JSON payloads are supported' }, { status: 400 });
    }

    if (!isValidHttpUrl(content)) {
      return NextResponse.json({ error: 'A valid http/https URL is required' }, { status: 400 });
    }

    const { data: created, error: insertError } = await supabaseAdmin
      .from('project_documentations')
      .insert({
        project_id: projectId,
        submitted_by: user.id,
        documentation_type: 'link',
        content,
        label,
      })
      .select('*')
      .single();

    if (insertError || !created) {
      return NextResponse.json({ error: 'Failed to save documentation link' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'create_project_documentation',
      tableName: 'project_documentations',
      recordId: created.id,
      metadata: { projectId, documentationType: 'link' },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/projects/[id]/documentation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const auth = await getProjectAuthedContext();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { supabaseAdmin, supabase, user, role } = auth.context;
    const documentationId = request.nextUrl.searchParams.get('documentationId');

    if (!documentationId) {
      return NextResponse.json({ error: 'documentationId is required' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('project_documentations')
      .select('*')
      .eq('id', documentationId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Documentation item not found' }, { status: 404 });
    }

    const canManageByMembership = await userCanAccessProject(supabaseAdmin, projectId, user.id, role);
    const canDelete =
      canManageByMembership && (isProjectAdmin(role) || existing.submitted_by === user.id);

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('project_documentations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentationId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete documentation' }, { status: 500 });
    }

    if (existing.documentation_type === 'file' && typeof existing.content === 'string') {
      await supabaseAdmin.storage.from(PROJECT_DOCUMENTATION_BUCKET).remove([existing.content]);
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'delete_project_documentation',
      tableName: 'project_documentations',
      recordId: documentationId,
      metadata: { projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/projects/[id]/documentation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
