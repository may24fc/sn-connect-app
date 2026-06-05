import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { canAccessCrm, CRM_TRACKER_VALUES } from '@/app/api/crm/_lib';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve role from app metadata or users table
    let role: string | null = null;
    if (typeof user.app_metadata?.db_role === 'string') {
      role = user.app_metadata.db_role;
    }

    if (!role) {
      const { data: roleData, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (!roleError && roleData) {
        role = roleData.role ?? null;
      }
    }

    if (canAccessCrm(role)) {
      return NextResponse.json({ data: { canAccess: true, grantedTrackers: [] } });
    }

    const { data: grantRows, error: grantsError } = await supabase
      .from('crm_access_grants')
      .select('tracker')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (grantsError) {
      console.error('Failed to fetch CRM grants for user:', grantsError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const trackers: string[] = (grantRows ?? []).map((r: any) => r.tracker).filter(Boolean);
    const grantedTrackers = trackers.filter((t) => CRM_TRACKER_VALUES.includes(t as any));

    return NextResponse.json({ data: { canAccess: grantedTrackers.length > 0, grantedTrackers } });
  } catch (error) {
    console.error('Unexpected error in GET /api/crm/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
