import { loadDirectoryPeople } from '@/lib/people/directory-people';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { getNormalizedMetadataRole, normalizeDbRoleClaim } from '@/lib/auth/role';

export const TICKET_TEAMS = ['hr', 'it'] as const;
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TICKET_STATUSES = [
  'new',
  'triaged',
  'assigned',
  'in_progress',
  'waiting_on_user',
  'resolved',
  'closed',
] as const;

export type TicketTeam = (typeof TICKET_TEAMS)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface TicketAccessRow {
  submitted_by: string;
  assigned_to: string | null;
  team: TicketTeam;
}

export interface TicketAuthedContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  user: { id: string; app_metadata?: Record<string, unknown> };
  role: string | null;
  isItHandler: boolean;
}

/** Name and contact for a ticket participant; names are null for accounts without an employee record. */
interface EmployeeProfileRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  company_email: string | null;
  personal_email: string | null;
}

interface UserRoleRow {
  id: string;
  role: string;
}

async function resolveUserRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: { id: string; app_metadata?: Record<string, unknown> }
): Promise<string | null> {
  const metadataRole = getNormalizedMetadataRole(user.app_metadata);

  if (metadataRole) {
    return metadataRole;
  }

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to resolve user role');
  }

  return normalizeDbRoleClaim(data?.role ?? null);
}

export async function isActiveItHandler(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('ticket_handlers')
    .select('id')
    .eq('user_id', userId)
    .eq('team', 'it')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to resolve ticket handler status');
  }

  return Boolean(data);
}

export async function getTicketAuthedContext(): Promise<
  { ok: true; context: TicketAuthedContext } | { ok: false; status: number; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }

    const role = await resolveUserRole(supabase, user);
    const isItHandler = await isActiveItHandler(supabaseAdmin, user.id).catch(() => false);

    return {
      ok: true,
      context: {
        supabase,
        supabaseAdmin,
        user,
        role,
        isItHandler,
      },
    };
  } catch (error) {
    console.error('Failed to initialize ticket auth context:', error);
    return { ok: false, status: 500, error: 'Failed to initialize request context' };
  }
}

export function isSuperAdminRole(role: string | null): boolean {
  return role === 'super_admin';
}

export function isAdminRole(role: string | null): boolean {
  return role === 'admin';
}

export function canAccessTicket(
  ticket: TicketAccessRow,
  userId: string,
  role: string | null,
  isItHandler: boolean
): boolean {
  if (ticket.submitted_by === userId) return true;
  if (isSuperAdminRole(role)) return true;
  if (ticket.team === 'hr' && isAdminRole(role) && ticket.assigned_to === userId) return true;
  if (ticket.team === 'it' && isItHandler && ticket.assigned_to === userId) return true;
  return false;
}

export function canWorkAssignedTicket(
  ticket: TicketAccessRow,
  userId: string,
  role: string | null,
  isItHandler: boolean
): boolean {
  if (isSuperAdminRole(role)) return true;
  if (ticket.team === 'hr' && isAdminRole(role) && ticket.assigned_to === userId) return true;
  if (ticket.team === 'it' && isItHandler && ticket.assigned_to === userId) return true;
  return false;
}

export async function validateTicketAssignee(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  assigneeId: string,
  team: TicketTeam
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('id', assigneeId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: 'Failed to validate assignee account' };
  }

  const userRow = user as UserRoleRow | null;

  if (!userRow) {
    return { ok: false, status: 400, error: 'Assigned user was not found' };
  }

  if (team === 'hr') {
    if (userRow.role !== 'admin') {
      return { ok: false, status: 400, error: 'HR tickets can only be assigned to admin users' };
    }

    return { ok: true };
  }

  if (userRow.role !== 'employee') {
    return {
      ok: false,
      status: 400,
      error: 'IT tickets can only be assigned to active employee handlers',
    };
  }

  const activeHandler = await isActiveItHandler(supabaseAdmin, assigneeId).catch(() => false);

  if (!activeHandler) {
    return {
      ok: false,
      status: 400,
      error: 'Selected employee is not an active IT ticket handler',
    };
  }

  return { ok: true };
}

export async function getEmployeeProfilesByUserId(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  userIds: string[]
): Promise<Map<string, EmployeeProfileRow>> {
  if (userIds.length === 0) {
    return new Map<string, EmployeeProfileRow>();
  }

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('user_id, first_name, last_name, company_email, personal_email')
    .in('user_id', userIds)
    .is('deleted_at', null);

  if (error) {
    throw new Error('Failed to fetch employee profiles');
  }

  const profiles = new Map(
    ((data || []) as Array<EmployeeProfileRow>).map((profile) => [profile.user_id, profile])
  );

  // Accounts without an employee record (often admins) still have a login email in the directory.
  const missingUserIds = userIds.filter((userId) => !profiles.has(userId));
  if (missingUserIds.length > 0) {
    const people = await loadDirectoryPeople(supabaseAdmin, missingUserIds);
    for (const [userId, person] of people) {
      profiles.set(userId, {
        user_id: userId,
        first_name: null,
        last_name: null,
        company_email: person.email,
        personal_email: null,
      });
    }
  }

  return profiles;
}

/**
 * Profile photo URLs for ticket participants the caller is already authorized to see.
 * Users without a photo are absent from the map; display falls back to initials.
 */
export async function getUserAvatarsByUserId(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  userIds: string[]
): Promise<Map<string, string>> {
  const avatars = new Map<string, string>();

  if (userIds.length === 0) {
    return avatars;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, avatar_url')
    .in('id', userIds);

  if (error) {
    throw new Error('Failed to fetch user avatars');
  }

  for (const row of (data || []) as Array<{ id: string; avatar_url: string | null }>) {
    if (row.avatar_url) {
      avatars.set(row.id, row.avatar_url);
    }
  }

  return avatars;
}

/** Employee name, else the account's email; the fallback is only for users that no longer exist. */
export function getDisplayName(
  profile:
    | {
        first_name: string | null;
        last_name: string | null;
        company_email?: string | null;
        personal_email?: string | null;
      }
    | undefined,
  fallback = 'Unknown user'
): string {
  if (!profile) {
    return fallback;
  }

  const name = [profile.first_name, profile.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  return name || profile.company_email?.trim() || profile.personal_email?.trim() || fallback;
}

export function getTicketWriteErrorMessage(
  error: { code?: string; message?: string } | null
): string {
  if (!error) {
    return 'Ticket operation failed';
  }

  if (error.code === '23503') {
    return 'Referenced user or ticket record does not exist';
  }

  return error.message || 'Ticket operation failed';
}