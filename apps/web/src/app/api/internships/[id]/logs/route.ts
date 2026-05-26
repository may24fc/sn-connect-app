import { logActivity } from '@/lib/audit';
import {
  buildListSummary,
  buildTasksCompletedSummary,
  normalizeAttachmentRecords,
  normalizeProjectEntries,
  normalizeStringList,
} from '@/lib/intern-daily-log';
import {
  createNotificationsForUsers,
  getAdminUserIds,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import {
  createInternDailyLogSchema,
  updateInternDailyLogSchema,
  updateInternDraftLogSchema,
} from '@/lib/schemas/internship.schema';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import type { DailyLogAttachment } from '@hr-portal/ui';
import { type NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { canAccessInternship, getAuthedInternshipContext, isInternshipAdmin } from '../../_lib';

const DAILY_LOG_ATTACHMENT_BUCKET = 'intern-daily-log-attachments';
const DAILY_LOG_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 10;
const DAILY_LOG_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
const DAILY_LOG_ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

type DailyLogPayload = z.infer<typeof createInternDailyLogSchema>;

function sanitizeAttachmentName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function enrichDailyLogRow(
  row: Record<string, unknown>,
  attachments: Array<DailyLogAttachment>
): Record<string, unknown> {
  return {
    ...row,
    project_entries: normalizeProjectEntries(row.project_entries, row.tasks_completed as string | null),
    blockers: normalizeStringList(undefined, row.challenges as string | null),
    next_steps: normalizeStringList(undefined, row.learnings as string | null),
    attachments,
  };
}

async function parseDailyLogRequest(
  request: NextRequest
): Promise<{ body: unknown; files: Array<File> }> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const payload = formData.get('payload');

    if (typeof payload !== 'string') {
      throw new Error('Missing payload');
    }

    return {
      body: JSON.parse(payload),
      files: formData.getAll('files').filter((file): file is File => file instanceof File),
    };
  }

  return {
    body: await request.json(),
    files: [],
  };
}

async function signDailyLogAttachments(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  attachments: Array<DailyLogAttachment>
): Promise<Array<DailyLogAttachment>> {
  return Promise.all(
    attachments.map(async (attachment) => {
      const { data, error } = await adminClient.storage
        .from(DAILY_LOG_ATTACHMENT_BUCKET)
        .createSignedUrl(attachment.filePath, DAILY_LOG_ATTACHMENT_SIGNED_URL_TTL_SECONDS);

      return {
        ...attachment,
        signedUrl: error ? null : data?.signedUrl ?? null,
      };
    })
  );
}

async function uploadDailyLogAttachments(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  internshipId: string,
  logId: string,
  files: Array<File>
): Promise<Array<DailyLogAttachment>> {
  const uploaded: Array<DailyLogAttachment> = [];

  for (const file of files) {
    if (!DAILY_LOG_ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
      throw new Error(`Unsupported attachment type: ${file.type || 'unknown'}`);
    }

    if (file.size > DAILY_LOG_ATTACHMENT_MAX_SIZE) {
      throw new Error('Attachment exceeds 10MB size limit');
    }

    const filePath = `${internshipId}/${logId}/${crypto.randomUUID()}-${sanitizeAttachmentName(file.name)}`;
    const { error } = await adminClient.storage
      .from(DAILY_LOG_ATTACHMENT_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error('Failed to upload daily log attachment');
    }

    uploaded.push({
      id: crypto.randomUUID(),
      fileName: file.name,
      filePath,
      fileSize: file.size,
      mimeType: file.type,
    });
  }

  return uploaded;
}

async function removeDailyLogAttachments(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  attachments: Array<DailyLogAttachment>
): Promise<void> {
  if (attachments.length === 0) {
    return;
  }

  await adminClient.storage
    .from(DAILY_LOG_ATTACHMENT_BUCKET)
    .remove(attachments.map((attachment) => attachment.filePath));
}

function buildDailyLogInsertValues(
  internshipId: string,
  logId: string,
  payload: DailyLogPayload,
  attachments: Array<DailyLogAttachment>
) {
  const projectEntries = payload.projectEntries.map((entry) => ({
    id: entry.id || crypto.randomUUID(),
    projectFocus: entry.projectFocus,
    challenge: entry.challenge,
    actionTaken: entry.actionTaken,
    outcome: entry.outcome,
  }));
  const blockers = payload.blockers ?? [];
  const nextSteps = payload.nextSteps ?? [];

  return {
    id: logId,
    internship_id: internshipId,
    log_date: payload.logDate,
    hours_worked: payload.hoursWorked,
    tasks_completed: buildTasksCompletedSummary(projectEntries),
    learnings: buildListSummary(nextSteps),
    challenges: buildListSummary(blockers),
    project_entries: projectEntries,
    attachments,
    status: payload.status ?? 'submitted',
    is_approved: false,
    approved_by: null,
    approved_at: null,
  };
}

function getDailyLogPersistenceErrorResponse(
  error: { code?: string | null; message?: string | null } | null | undefined,
  fallbackMessage: string
) {
  if (error?.code === '23505') {
    return NextResponse.json(
      { error: 'A daily log already exists for this date' },
      { status: 409 }
    );
  }

  if (
    error?.code === '23514' &&
    error.message?.includes('chk_intern_daily_logs_hours_valid')
  ) {
    return NextResponse.json(
      { error: 'Hours worked must be between 0.25 and 40.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedInternshipContext();
    const adminClient = createSupabaseAdminClient();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await canAccessInternship(supabase, id, user.id, role);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: queryError } = await supabase
      .from('intern_daily_logs')
      .select('*')
      .eq('internship_id', id)
      .order('log_date', { ascending: false });

    if (queryError) {
      console.error('Error fetching intern daily logs:', queryError);
      return NextResponse.json({ error: 'Failed to fetch daily logs' }, { status: 500 });
    }

    const enriched = await Promise.all(
      (data || []).map(async (row: Record<string, unknown>) => {
        const attachments = await signDailyLogAttachments(
          adminClient,
          normalizeAttachmentRecords(row.attachments)
        );
        return enrichDailyLogRow(row, attachments);
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error('Unexpected error in GET /api/internships/[id]/logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedInternshipContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await canAccessInternship(supabase, id, user.id, role);
    if (!access.allowed || !access.internship) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const internship = access.internship as {
      employee_id: string;
      completed_hours?: number;
    };
    const isAdmin = isInternshipAdmin(role);
    const canSubmitForSelf =
      access.employeeId !== null && access.employeeId === internship.employee_id;

    if (!isAdmin && !canSubmitForSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createSupabaseAdminClient();
    const { body, files } = await parseDailyLogRequest(request);
    const parsed = createInternDailyLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const logId = crypto.randomUUID();
    let uploadedAttachments: Array<DailyLogAttachment> = [];

    try {
      uploadedAttachments = await uploadDailyLogAttachments(adminClient, id, logId, files);
    } catch (uploadError) {
      return NextResponse.json(
        {
          error:
            uploadError instanceof Error
              ? uploadError.message
              : 'Failed to upload attachments',
        },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabase
      .from('intern_daily_logs')
      .insert(
        buildDailyLogInsertValues(id, logId, payload, [
          ...normalizeAttachmentRecords(payload.retainedAttachments),
          ...uploadedAttachments,
        ])
      )
      .select('*')
      .single();

    if (insertError || !data) {
      await removeDailyLogAttachments(adminClient, uploadedAttachments);
      console.error('Error creating intern daily log:', insertError);
      return getDailyLogPersistenceErrorResponse(insertError, 'Failed to create daily log');
    }

    if ((payload.status ?? 'submitted') === 'submitted') {
      const internshipUpdate = await supabase
        .from('internships')
        .update({ completed_hours: Number(internship.completed_hours || 0) + payload.hoursWorked })
        .eq('id', id)
        .select('id, completed_hours')
        .single();

      if (internshipUpdate.error) {
        console.error('Error updating internship completed hours:', internshipUpdate.error);
      }

      const submitterName = await getUserDisplayName(user.id);
      const adminIds = await getAdminUserIds();
      const adminRecipients = adminIds.filter((adminId) => adminId !== user.id);

      createNotificationsForUsers(adminRecipients, {
        type: 'intern_log_submitted',
        title: 'Intern Daily Log Submitted',
        message: `${submitterName} submitted a daily log for ${payload.logDate}`,
        link: `/admin/interns/${id}`,
        metadata: { internshipId: id, logDate: payload.logDate, submittedBy: user.id },
      });

      logActivity(supabase, {
        userId: user.id,
        action: 'submit_intern_daily_log',
        tableName: 'intern_daily_logs',
        recordId: data.id,
      });
    }

    const attachments = await signDailyLogAttachments(
      adminClient,
      normalizeAttachmentRecords(data.attachments)
    );

    return NextResponse.json({ data: enrichDailyLogRow(data, attachments) }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/internships/[id]/logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedInternshipContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await canAccessInternship(supabase, id, user.id, role);
    if (!access.allowed || !access.internship) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const internship = access.internship as {
      supervisor_id: string | null;
      employee_id: string;
      completed_hours?: number;
    };
    const isAdmin = isInternshipAdmin(role);
    const isSupervisor = internship.supervisor_id === user.id;
    const isOwnIntern = access.employeeId !== null && access.employeeId === internship.employee_id;
    const { body, files } = await parseDailyLogRequest(request);

    if (isOwnIntern && !isAdmin && !isSupervisor) {
      const parsed = updateInternDraftLogSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const payload = parsed.data;
      const { data: existingLog } = await supabase
        .from('intern_daily_logs')
        .select('id, status, hours_worked, project_entries, attachments, tasks_completed, learnings, challenges')
        .eq('id', payload.logId)
        .eq('internship_id', id)
        .single();

      if (!existingLog) {
        return NextResponse.json({ error: 'Log not found' }, { status: 404 });
      }

      if (existingLog.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft logs can be edited' }, { status: 403 });
      }

      const adminClient = createSupabaseAdminClient();
      const existingAttachments = normalizeAttachmentRecords(existingLog.attachments);
      const retainedAttachments =
        payload.retainedAttachments !== undefined
          ? normalizeAttachmentRecords(payload.retainedAttachments)
          : existingAttachments;
      const removedAttachments = existingAttachments.filter(
        (attachment) =>
          !retainedAttachments.some((retained) => retained.filePath === attachment.filePath)
      );

      let uploadedAttachments: Array<DailyLogAttachment> = [];
      try {
        uploadedAttachments = await uploadDailyLogAttachments(adminClient, id, payload.logId, files);
      } catch (uploadError) {
        return NextResponse.json(
          {
            error:
              uploadError instanceof Error
                ? uploadError.message
                : 'Failed to upload attachments',
          },
          { status: 400 }
        );
      }

      const projectEntries =
        payload.projectEntries !== undefined
          ? payload.projectEntries.map((entry) => ({
              id: entry.id || crypto.randomUUID(),
              projectFocus: entry.projectFocus,
              challenge: entry.challenge,
              actionTaken: entry.actionTaken,
              outcome: entry.outcome,
            }))
          : normalizeProjectEntries(existingLog.project_entries, existingLog.tasks_completed);
      const blockers =
        payload.blockers !== undefined
          ? payload.blockers
          : normalizeStringList(undefined, existingLog.challenges);
      const nextSteps =
        payload.nextSteps !== undefined
          ? payload.nextSteps
          : normalizeStringList(undefined, existingLog.learnings);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (payload.logDate !== undefined) updates.log_date = payload.logDate;
      if (payload.hoursWorked !== undefined) updates.hours_worked = payload.hoursWorked;
      if (payload.projectEntries !== undefined) {
        updates.project_entries = projectEntries;
        updates.tasks_completed = buildTasksCompletedSummary(projectEntries);
      }
      if (payload.blockers !== undefined) {
        updates.challenges = buildListSummary(blockers);
      }
      if (payload.nextSteps !== undefined) {
        updates.learnings = buildListSummary(nextSteps);
      }
      if (payload.retainedAttachments !== undefined || uploadedAttachments.length > 0) {
        updates.attachments = [...retainedAttachments, ...uploadedAttachments];
      }
      if (payload.status !== undefined) updates.status = payload.status;

      const { data, error: updateError } = await supabase
        .from('intern_daily_logs')
        .update(updates)
        .eq('id', payload.logId)
        .eq('internship_id', id)
        .select('*')
        .single();

      if (updateError || !data) {
        await removeDailyLogAttachments(adminClient, uploadedAttachments);
        console.error('Error updating draft log:', updateError);
        return getDailyLogPersistenceErrorResponse(updateError, 'Failed to update daily log');
      }

      await removeDailyLogAttachments(adminClient, removedAttachments);

      if (payload.status === 'submitted') {
        const hoursToAdd = payload.hoursWorked ?? existingLog.hours_worked;
        const internshipUpdate = await supabase
          .from('internships')
          .update({ completed_hours: Number(internship.completed_hours || 0) + Number(hoursToAdd) })
          .eq('id', id)
          .select('id, completed_hours')
          .single();

        if (internshipUpdate.error) {
          console.error('Error updating internship completed hours:', internshipUpdate.error);
        }
      }

      const attachments = await signDailyLogAttachments(
        adminClient,
        normalizeAttachmentRecords(data.attachments)
      );

      return NextResponse.json({ data: enrichDailyLogRow(data, attachments) });
    }

    if (!isAdmin && !isSupervisor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = updateInternDailyLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const updates: Record<string, unknown> = {};

    if (payload.supervisorNotes !== undefined) {
      updates.supervisor_notes = payload.supervisorNotes;
    }

    if (payload.isApproved !== undefined) {
      updates.is_approved = payload.isApproved;
      updates.approved_by = payload.isApproved ? user.id : null;
      updates.approved_at = payload.isApproved ? new Date().toISOString() : null;
    }

    const { data, error: updateError } = await supabase
      .from('intern_daily_logs')
      .update(updates)
      .eq('id', payload.logId)
      .eq('internship_id', id)
      .select('*')
      .single();

    if (updateError || !data) {
      console.error('Error updating daily log:', updateError);
      return NextResponse.json({ error: 'Failed to update daily log' }, { status: 500 });
    }

    if (payload.isApproved !== undefined && access.employeeId) {
      const approverName = await getUserDisplayName(user.id);
      const isApproved = payload.isApproved;

      if (isApproved) {
        createNotificationsForUsers([access.employeeId], {
          type: 'intern_log_approved',
          title: 'Daily Log Approved',
          message: `${approverName} approved your daily log for ${data.log_date}`,
          link: `/intern/dashboard`,
          metadata: { internshipId: id, logDate: data.log_date, approvedBy: user.id },
        });
      } else {
        createNotificationsForUsers([access.employeeId], {
          type: 'system',
          title: 'Daily Log Review',
          message: `${approverName} reviewed your daily log for ${data.log_date}${data.supervisor_notes ? `: ${data.supervisor_notes}` : ''}`,
          link: `/intern/dashboard`,
          metadata: { internshipId: id, logDate: data.log_date, reviewedBy: user.id },
        });
      }

      logActivity(supabase, {
        userId: user.id,
        action: isApproved ? 'approve_intern_log' : 'review_intern_log',
        tableName: 'intern_daily_logs',
        recordId: data.id,
        metadata: { isApproved, supervisorNotes: data.supervisor_notes },
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/internships/[id]/logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
