import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'];

/**
 * GET /api/dashboard/stats
 * Returns aggregate counts for admin dashboard stat cards:
 * - totalEmployees (non-deleted employees)
 * - activeInterns (internships with status = 'active')
 * - reviewsDue (performance_reviews with status in pending/self_review/manager_review)
 * - recentHires (employees created in last 30 days)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    let role: string | null = null;
    if (typeof user.app_metadata?.db_role === 'string') {
      role = user.app_metadata.db_role;
    }

    if (!role) {
      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      role = roleData?.role ?? null;
    }

    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Run all queries in parallel
    const [employeesResult, internsResult, reviewsResult, recentHiresResult] = await Promise.all([
      // Total employees (non-deleted, non-terminated)
      supabase
        .from('employee_directory')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'terminated')
        .not('role', 'eq', 'associate'),

      // Active interns
      supabase
        .from('internships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Reviews due (pending flow states before completion)
      supabase
        .from('performance_reviews')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'self_review', 'manager_review'])
        .is('deleted_at', null),

      // Recent hires (last 30 days, non-terminated)
      supabase
        .from('employee_directory')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'terminated')
        .not('role', 'eq', 'associate')
        .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString()),
    ]);

    const totalEmployees = employeesResult.count ?? 0;
    const activeInterns = internsResult.count ?? 0;
    const reviewsDue = reviewsResult.count ?? 0;
    const recentHires = recentHiresResult.count ?? 0;

    return NextResponse.json({
      data: {
        totalEmployees,
        activeInterns,
        reviewsDue,
        recentHires,
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
