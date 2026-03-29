import { NextResponse } from 'next/server';
import {
  getDisplayName,
  getEmployeeProfilesByUserId,
  getTicketAuthedContext,
  isSuperAdminRole,
} from '../_lib';

interface TicketAssigneeOption {
  id: string;
  team: 'hr' | 'it';
  role: 'admin' | 'employee';
  name: string;
  email: string | null;
}

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

    const { data: adminUsers, error: adminUsersError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('role', 'admin')
      .is('deleted_at', null);

    if (adminUsersError) {
      console.error('Failed to fetch HR ticket assignees:', adminUsersError);
      return NextResponse.json({ error: 'Failed to fetch assignees' }, { status: 500 });
    }

    const { data: itHandlers, error: itHandlersError } = await supabaseAdmin
      .from('ticket_handlers')
      .select('user_id, team')
      .eq('team', 'it')
      .eq('is_active', true);

    if (itHandlersError) {
      console.error('Failed to fetch IT ticket handlers:', itHandlersError);
      return NextResponse.json({ error: 'Failed to fetch assignees' }, { status: 500 });
    }

    const userIds = Array.from(
      new Set([
        ...(adminUsers || []).map((entry) => entry.id),
        ...((itHandlers || []).map((entry) => entry.user_id)),
      ])
    );

    const profilesByUserId = await getEmployeeProfilesByUserId(supabaseAdmin, userIds).catch(
      () => new Map()
    );

    const hrOptions: Array<TicketAssigneeOption> = (adminUsers || []).map((entry) => {
      const profile = profilesByUserId.get(entry.id);
      return {
        id: entry.id,
        team: 'hr',
        role: 'admin',
        name: getDisplayName(profile, 'Admin User'),
        email: profile?.company_email || profile?.personal_email || null,
      };
    });

    const itOptions: Array<TicketAssigneeOption> = (itHandlers || []).map((entry) => {
      const profile = profilesByUserId.get(entry.user_id);
      return {
        id: entry.user_id,
        team: 'it',
        role: 'employee',
        name: getDisplayName(profile, 'IT Handler'),
        email: profile?.company_email || profile?.personal_email || null,
      };
    });

    return NextResponse.json({
      data: [...hrOptions, ...itOptions].sort((left, right) => left.name.localeCompare(right.name)),
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/tickets/assignees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}