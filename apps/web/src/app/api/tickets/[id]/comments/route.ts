import { logActivity } from '@/lib/audit';
import {
  createNotification,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  canAccessTicket,
  getDisplayName,
  getEmployeeProfilesByUserId,
  getTicketAuthedContext,
  type TicketAuthedContext,
  type TicketAccessRow,
} from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface TicketCommentRow {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface TicketParticipantRow extends TicketAccessRow {
  id: string;
  title: string;
}

const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Reply is required').max(5000),
});

async function loadTicket(
  ticketId: string,
  auth: TicketAuthedContext
): Promise<TicketParticipantRow | null> {
  const { data, error } = await auth.supabaseAdmin
    .from('tickets')
    .select('id, title, submitted_by, assigned_to, team')
    .eq('id', ticketId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as TicketParticipantRow;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { user, role, isItHandler, supabaseAdmin } = auth.context;
    const ticket = await loadTicket(id, auth.context);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (!canAccessTicket(ticket, user.id, role, isItHandler)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch ticket replies' }, { status: 500 });
    }

    const comments = (data || []) as Array<TicketCommentRow>;
    const profilesByUserId = await getEmployeeProfilesByUserId(
      supabaseAdmin,
      Array.from(new Set(comments.map((comment) => comment.user_id)))
    ).catch(() => new Map());

    return NextResponse.json({
      data: comments.map((comment) => ({
        ...comment,
        user_name: getDisplayName(profilesByUserId.get(comment.user_id), 'Ticket Participant'),
      })),
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/tickets/[id]/comments:', error);
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
    const ticket = await loadTicket(id, auth.context);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (!canAccessTicket(ticket, user.id, role, isItHandler)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('ticket_comments')
      .insert({
        ticket_id: id,
        user_id: user.id,
        content: parsed.data.content,
      })
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create ticket reply' }, { status: 500 });
    }

    const actorName = await getUserDisplayName(user.id);
    const recipients = Array.from(
      new Set([ticket.submitted_by, ticket.assigned_to].filter((value): value is string => Boolean(value)))
    ).filter((recipientId) => recipientId !== user.id);

    for (const recipientId of recipients) {
      createNotification({
        userId: recipientId,
        type: 'system',
        title: 'New ticket reply',
        message: `${actorName} replied on "${ticket.title}"`,
        link: recipientId === ticket.submitted_by ? '/tickets' : ticket.team === 'hr' ? '/admin/tickets' : '/tickets',
        metadata: { ticketId: ticket.id, commentId: data.id },
      });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_ticket_comment',
      tableName: 'ticket_comments',
      recordId: data.id,
      metadata: {
        ticketId: ticket.id,
      },
    });

    const comment = data as TicketCommentRow;
    return NextResponse.json(
      {
        data: {
          ...comment,
          user_name: actorName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/tickets/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}