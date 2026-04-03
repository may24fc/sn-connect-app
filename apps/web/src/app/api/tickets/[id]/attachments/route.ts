import { logActivity } from '@/lib/audit';
import { type NextRequest, NextResponse } from 'next/server';
import {
  canAccessTicket,
  getTicketAuthedContext,
  getTicketWriteErrorMessage,
  type TicketAuthedContext,
  type TicketAccessRow,
} from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface TicketAttachmentRow {
  id: string;
  ticket_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_SIZE = 10 * 1024 * 1024;

async function loadTicketAccess(
  ticketId: string,
  auth: TicketAuthedContext
): Promise<TicketAccessRow | null> {
  const { data, error } = await auth.supabaseAdmin
    .from('tickets')
    .select('submitted_by, assigned_to, team')
    .eq('id', ticketId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as TicketAccessRow;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ticket = await loadTicketAccess(id, auth.context);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const { user, role, isItHandler, supabaseAdmin } = auth.context;

    if (!canAccessTicket(ticket, user.id, role, isItHandler)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch ticket attachments' }, { status: 500 });
    }

    const attachments = (data || []) as Array<TicketAttachmentRow>;
    const attachmentData = await Promise.all(
      attachments.map(async (attachment) => {
        const { data: signedData, error: signedError } = await supabaseAdmin.storage
          .from('ticket-attachments')
          .createSignedUrl(attachment.file_path, 60 * 10);

        return {
          ...attachment,
          signed_url: signedError ? null : signedData?.signedUrl ?? null,
        };
      })
    );

    return NextResponse.json({ data: attachmentData });
  } catch (error) {
    console.error('Unexpected error in GET /api/tickets/[id]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { user, role, isItHandler, supabaseAdmin } = auth.context;
    const ticket = await loadTicketAccess(id, auth.context);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (!canAccessTicket(ticket, user.id, role, isItHandler)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10MB size limit' }, { status: 400 });
    }

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${id}/${crypto.randomUUID()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('ticket-attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading ticket attachment:', uploadError);
      return NextResponse.json({ error: 'Failed to upload ticket attachment' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('ticket_attachments')
      .insert({
        ticket_id: id,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .select('*')
      .single();

    if (error || !data) {
      await supabaseAdmin.storage.from('ticket-attachments').remove([filePath]);
      return NextResponse.json({ error: getTicketWriteErrorMessage(error) }, { status: 500 });
    }

    await supabaseAdmin
      .from('tickets')
      .update({ has_attachments: true })
      .eq('id', id)
      .is('deleted_at', null);

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_ticket_attachment',
      tableName: 'ticket_attachments',
      recordId: data.id,
      metadata: {
        ticketId: id,
        fileName: data.file_name,
        mimeType: data.mime_type,
      },
    });

    const attachment = data as TicketAttachmentRow;
    const { data: signedData } = await supabaseAdmin.storage
      .from('ticket-attachments')
      .createSignedUrl(attachment.file_path, 60 * 10);

    return NextResponse.json(
      { data: { ...attachment, signed_url: signedData?.signedUrl ?? null } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/tickets/[id]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}