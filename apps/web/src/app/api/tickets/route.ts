import { logActivity } from '@/lib/audit';
import { createNotification, getUserDisplayName, getUserIdsByRoles } from '@/lib/notifications/create-notification';
import {
  type TicketCategory,
  ticketCreateSchema,
  type TicketFeatureArea,
} from '@/lib/schemas/ticket.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  getDisplayName,
  getEmployeeProfilesByUserId,
  getTicketAuthedContext,
  getTicketWriteErrorMessage,
  isAdminRole,
  isSuperAdminRole,
  type TicketPriority,
  type TicketStatus,
  type TicketTeam,
} from './_lib';

interface TicketRow {
  id: string;
  title: string;
  description: string;
  team: TicketTeam;
  category: TicketCategory;
  feature_area: TicketFeatureArea | null;
  priority: TicketPriority;
  status: TicketStatus;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  has_attachments: boolean;
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

export async function GET(request: NextRequest) {
  try {
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, role, isItHandler } = auth.context;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const team = searchParams.get('team') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const scope = searchParams.get('scope') || (isSuperAdminRole(role) ? 'triage' : 'submitter');
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '20', 10);

    let query = supabaseAdmin
      .from('tickets')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (team) {
      query = query.eq('team', team);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (scope === 'triage') {
      if (!isSuperAdminRole(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (scope === 'assigned') {
      query = query.eq('assigned_to', user.id);

      if (isAdminRole(role)) {
        query = query.eq('team', 'hr');
      } else if (isItHandler) {
        query = query.eq('team', 'it');
      } else if (!isSuperAdminRole(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      query = query.eq('submitted_by', user.id);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tickets:', error);
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }

    const tickets = (data || []) as Array<TicketRow>;
    const userIds = Array.from(
      new Set(
        tickets
          .flatMap((ticket) => [ticket.submitted_by, ticket.assigned_to, ticket.assigned_by])
          .filter((value): value is string => Boolean(value))
      )
    );

    const profilesByUserId = await getEmployeeProfilesByUserId(supabaseAdmin, userIds).catch(
      () => new Map()
    );

    return NextResponse.json({
      data: tickets.map((ticket) => ({
        ...ticket,
        submitted_by_name: getDisplayName(profilesByUserId.get(ticket.submitted_by), 'Ticket Submitter'),
        assigned_to_name: ticket.assigned_to
          ? getDisplayName(profilesByUserId.get(ticket.assigned_to), 'Assigned Handler')
          : null,
        assigned_by_name: ticket.assigned_by
          ? getDisplayName(profilesByUserId.get(ticket.assigned_by), 'Dispatcher')
          : null,
      })),
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user } = auth.context;
    const body = await request.json();
    const parsed = ticketCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .insert({
        title: parsed.data.title,
        description: parsed.data.description,
        team: parsed.data.team,
        category: parsed.data.category,
        feature_area: parsed.data.featureArea ?? null,
        priority: parsed.data.priority,
        status: 'new',
        steps_to_reproduce: parsed.data.stepsToReproduce ?? null,
        expected_behavior: parsed.data.expectedBehavior ?? null,
        submitted_by: user.id,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating ticket:', error);
      return NextResponse.json({ error: getTicketWriteErrorMessage(error) }, { status: 500 });
    }

    const submitterName = await getUserDisplayName(user.id);
    const superAdminIds = await getUserIdsByRoles(['super_admin']);

    for (const superAdminId of superAdminIds) {
      createNotification({
        userId: superAdminId,
        type: 'system',
        title: 'New support ticket submitted',
        message: `${submitterName} submitted a ${parsed.data.team.toUpperCase()} ticket: "${parsed.data.title}"`,
        link: '/super-admin/tasks?tab=tickets',
        metadata: { ticketId: data.id, team: parsed.data.team },
      });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_ticket',
      tableName: 'tickets',
      recordId: data.id,
      metadata: {
        team: data.team,
        category: data.category,
        featureArea: data.feature_area,
        priority: data.priority,
        title: data.title,
        hasAttachments: data.has_attachments,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}