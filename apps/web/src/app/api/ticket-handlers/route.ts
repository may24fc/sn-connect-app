import { ticketHandlerSchema } from '@/lib/schemas/ticket.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  getDisplayName,
  getEmployeeProfilesByUserId,
  getTicketAuthedContext,
  isSuperAdminRole,
} from '../tickets/_lib';

export async function GET() {
  try {
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, role } = auth.context;

    if (!isSuperAdminRole(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('ticket_handlers')
      .select('user_id, team, is_active, assigned_by, created_at, updated_at')
      .eq('team', 'it')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch ticket handlers:', error);
      return NextResponse.json({ error: 'Failed to fetch ticket handlers' }, { status: 500 });
    }

    const rows = data || [];
    const userIds = Array.from(
      new Set(
        rows.flatMap((row) => [row.user_id, row.assigned_by]).filter(
          (value): value is string => Boolean(value)
        )
      )
    );

    const profilesByUserId = await getEmployeeProfilesByUserId(supabaseAdmin, userIds).catch(
      () => new Map()
    );

    return NextResponse.json({
      data: rows.map((row) => ({
        ...row,
        user_name: getDisplayName(profilesByUserId.get(row.user_id), 'IT Handler'),
        user_email:
          profilesByUserId.get(row.user_id)?.company_email ||
          profilesByUserId.get(row.user_id)?.personal_email ||
          null,
        assigned_by_name: row.assigned_by
          ? getDisplayName(profilesByUserId.get(row.assigned_by), 'Super Admin')
          : null,
      })),
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/ticket-handlers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, role } = auth.context;

    if (!isSuperAdminRole(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ticketHandlerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', parsed.data.userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'Selected employee was not found' }, { status: 400 });
    }

    if (userRecord.role !== 'employee') {
      return NextResponse.json(
        { error: 'Only employee accounts can be registered as IT ticket handlers' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('ticket_handlers')
      .upsert(
        {
          user_id: parsed.data.userId,
          team: 'it',
          is_active: true,
          assigned_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,team' }
      )
      .select('user_id, team, is_active, assigned_by, created_at, updated_at')
      .single();

    if (error || !data) {
      console.error('Failed to create ticket handler:', error);
      return NextResponse.json({ error: 'Failed to save ticket handler' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/ticket-handlers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, role } = auth.context;

    if (!isSuperAdminRole(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('ticket_handlers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('team', 'it');

    if (error) {
      console.error('Failed to deactivate ticket handler:', error);
      return NextResponse.json({ error: 'Failed to update ticket handler' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/ticket-handlers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}