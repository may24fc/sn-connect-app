import { logActivity } from '@/lib/audit';
import { createNotification, getUserDisplayName } from '@/lib/notifications/create-notification';
import { ticketUpdateSchema } from '@/lib/schemas/ticket.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  getDisplayName,
  getEmployeeProfilesByUserId,
  getTicketAuthedContext,
  getTicketWriteErrorMessage,
  isAdminRole,
  isSuperAdminRole,
  validateTicketAssignee,
  type TicketPriority,
  type TicketStatus,
  type TicketTeam,
} from '../_lib';

interface TicketRow {
  id: string;
  title: string;
  description: string;
  team: TicketTeam;
  priority: TicketPriority;
  status: TicketStatus;
  submitted_by: string;
  assigned_to: string | null;
  assigned_by: string | null;
  triaged_by: string | null;
  triaged_at: string | null;
  resolution_summary: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

function canAccessTicket(ticket: TicketRow, userId: string, role: string | null, isItHandler: boolean): boolean {
  if (ticket.submitted_by === userId) return true;
  if (isSuperAdminRole(role)) return true;
  if (ticket.team === 'hr' && isAdminRole(role) && ticket.assigned_to === userId) return true;
  if (ticket.team === 'it' && isItHandler && ticket.assigned_to === userId) return true;
  return false;
}

function canWorkAssignedTicket(ticket: TicketRow, userId: string, role: string | null, isItHandler: boolean): boolean {
  if (isSuperAdminRole(role)) return true;
  if (ticket.team === 'hr' && isAdminRole(role) && ticket.assigned_to === userId) return true;
  if (ticket.team === 'it' && isItHandler && ticket.assigned_to === userId) return true;
  return false;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, role, isItHandler } = auth.context;

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    const ticket = data as TicketRow | null;

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (!canAccessTicket(ticket, user.id, role, isItHandler)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profilesByUserId = await getEmployeeProfilesByUserId(
      supabaseAdmin,
      [ticket.submitted_by, ticket.assigned_to, ticket.assigned_by].filter(
        (value): value is string => Boolean(value)
      )
    ).catch(() => new Map());

    return NextResponse.json({
      data: {
        ...ticket,
        submitted_by_name: getDisplayName(profilesByUserId.get(ticket.submitted_by), 'Ticket Submitter'),
        assigned_to_name: ticket.assigned_to
          ? getDisplayName(profilesByUserId.get(ticket.assigned_to), 'Assigned Handler')
          : null,
        assigned_by_name: ticket.assigned_by
          ? getDisplayName(profilesByUserId.get(ticket.assigned_by), 'Dispatcher')
          : null,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/tickets/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, role, isItHandler } = auth.context;
    const body = await request.json();
    const parsed = ticketUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    const existingTicket = existingData as TicketRow | null;

    if (existingError || !existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const canWorkTicket = canWorkAssignedTicket(existingTicket, user.id, role, isItHandler);

    if (!(isSuperAdminRole(role) || canWorkTicket)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isSuperAdminRole(role)) {
      if (
        parsed.data.assignedTo !== undefined ||
        parsed.data.team !== undefined ||
        parsed.data.priority !== undefined
      ) {
        return NextResponse.json(
          { error: 'Only super-admin can reassign or reclassify tickets' },
          { status: 403 }
        );
      }
    }

    const updates: Record<string, string | null> = {};
    const nextTeam = parsed.data.team ?? existingTicket.team;

    if (isSuperAdminRole(role)) {
      if (parsed.data.team !== undefined && parsed.data.team !== existingTicket.team) {
        updates.team = parsed.data.team;
        updates.assigned_to = null;
        updates.assigned_by = null;
        updates.status = parsed.data.status ?? 'triaged';
        updates.triaged_by = user.id;
        updates.triaged_at = new Date().toISOString();
      }

      if (parsed.data.assignedTo !== undefined) {
        if (parsed.data.assignedTo) {
          const assigneeValidation = await validateTicketAssignee(
            supabaseAdmin,
            parsed.data.assignedTo,
            nextTeam
          );

          if (!assigneeValidation.ok) {
            return NextResponse.json(
              { error: assigneeValidation.error },
              { status: assigneeValidation.status }
            );
          }
        }

        updates.assigned_to = parsed.data.assignedTo || null;
        updates.assigned_by = parsed.data.assignedTo ? user.id : null;
        updates.status = parsed.data.assignedTo ? parsed.data.status ?? 'assigned' : parsed.data.status ?? 'triaged';
        updates.triaged_by = user.id;
        updates.triaged_at = new Date().toISOString();
      }

      if (parsed.data.priority !== undefined) {
        updates.priority = parsed.data.priority;
      }
    }

    if (parsed.data.status !== undefined && updates.status === undefined) {
      updates.status = parsed.data.status;
    }

    if (parsed.data.resolutionSummary !== undefined) {
      updates.resolution_summary = parsed.data.resolutionSummary || null;
    }

    const effectiveStatus = (updates.status as TicketStatus | undefined) ?? existingTicket.status;
    if (effectiveStatus === 'resolved' || effectiveStatus === 'closed') {
      updates.resolved_at = new Date().toISOString();
    } else if (parsed.data.status !== undefined) {
      updates.resolved_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error updating ticket:', error);
      return NextResponse.json({ error: getTicketWriteErrorMessage(error) }, { status: 500 });
    }

    const ticket = data as TicketRow;
    const actorName = await getUserDisplayName(user.id);

    if (ticket.assigned_to && ticket.assigned_to !== existingTicket.assigned_to) {
      createNotification({
        userId: ticket.assigned_to,
        type: 'system',
        title: 'Support ticket assigned to you',
        message: `${actorName} assigned you the ${ticket.team.toUpperCase()} ticket "${ticket.title}"`,
        link: ticket.team === 'hr' ? '/admin/tickets' : '/tickets',
        metadata: { ticketId: ticket.id, team: ticket.team },
      });
    }

    if (ticket.submitted_by !== user.id && parsed.data.status !== undefined) {
      createNotification({
        userId: ticket.submitted_by,
        type: 'system',
        title: 'Your ticket was updated',
        message: `${actorName} updated "${ticket.title}" to ${ticket.status.replace(/_/g, ' ')}`,
        link: '/tickets',
        metadata: { ticketId: ticket.id, status: ticket.status },
      });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'update_ticket',
      tableName: 'tickets',
      recordId: ticket.id,
      metadata: {
        team: ticket.team,
        status: ticket.status,
        assignedTo: ticket.assigned_to,
      },
    });

    const profilesByUserId = await getEmployeeProfilesByUserId(
      supabaseAdmin,
      [ticket.submitted_by, ticket.assigned_to, ticket.assigned_by].filter(
        (value): value is string => Boolean(value)
      )
    ).catch(() => new Map());

    return NextResponse.json({
      data: {
        ...ticket,
        submitted_by_name: getDisplayName(profilesByUserId.get(ticket.submitted_by), 'Ticket Submitter'),
        assigned_to_name: ticket.assigned_to
          ? getDisplayName(profilesByUserId.get(ticket.assigned_to), 'Assigned Handler')
          : null,
        assigned_by_name: ticket.assigned_by
          ? getDisplayName(profilesByUserId.get(ticket.assigned_by), 'Dispatcher')
          : null,
      },
    });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/tickets/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}