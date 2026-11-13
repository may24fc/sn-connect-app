import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { logActivity } from '@/lib/audit';
import {
  crossDepartmentWorkRequestResponseSchema,
  crossDepartmentWorkRequestRevisionSchema,
} from '@/lib/schemas/work-request.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const resultSchema = z.object({
  ok: z.boolean().optional(),
  error: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

const responseErrors: Record<string, { status: number; message: string }> = {
  not_found: { status: 404, message: 'Department request not found' },
  not_pending: { status: 409, message: 'Another reviewer has already handled this request' },
  not_editable: { status: 409, message: 'This request can no longer be changed' },
  self_review: { status: 403, message: 'Requesters cannot approve their own department requests' },
  forbidden: { status: 403, message: 'You cannot update this department request' },
  inactive: { status: 403, message: 'Your account cannot review this request' },
  invalid_action: { status: 400, message: 'Invalid request action' },
  note_required: { status: 400, message: 'Add a reason before requesting changes or declining' },
  invalid_assignee: { status: 400, message: 'Choose an active member of the requested department' },
  project_unavailable: { status: 409, message: 'The linked project is no longer available' },
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
  }
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabaseAdmin, supabase, user } = auth.context;
  const body: unknown = await request.json().catch(() => null);

  const response = crossDepartmentWorkRequestResponseSchema.safeParse(body);
  const revision = crossDepartmentWorkRequestRevisionSchema.safeParse(body);
  let rpcData: unknown;
  let rpcError: { code?: string } | null;
  let action: string;

  if (response.success) {
    action = response.data.action;
    const result = await supabaseAdmin.rpc('respond_cross_department_work_request', {
      p_request_id: id,
      p_actor: user.id,
      p_action: response.data.action,
      p_assignee: response.data.assigneeId ?? null,
      p_note: response.data.note ?? null,
    });
    rpcData = result.data;
    rpcError = result.error;
  } else if (revision.success) {
    action = revision.data.action;
    const result = await supabaseAdmin.rpc('revise_cross_department_work_request', {
      p_request_id: id,
      p_actor: user.id,
      p_action: revision.data.action,
      p_input: revision.data,
    });
    rpcData = result.data;
    rpcError = result.error;
  } else {
    return NextResponse.json({ error: 'Check the department request action' }, { status: 400 });
  }

  if (rpcError) {
    console.error('PATCH /api/work-requests/[id] failed:', rpcError.code);
    return NextResponse.json({ error: 'Failed to update department request' }, { status: 500 });
  }
  const parsed = resultSchema.safeParse(rpcData);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid department request response' }, { status: 500 });
  }
  if (parsed.data.error) {
    const failure = responseErrors[parsed.data.error] ?? {
      status: 400,
      message: 'Could not update this department request',
    };
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }

  logActivity(supabase, {
    userId: user.id,
    action: `cross_department_request_${action}`,
    tableName: 'cross_department_work_requests',
    recordId: id,
  });
  return NextResponse.json({ data: parsed.data.data });
}
