import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/dashboard/super-admin-stats
 * Returns aggregate stats for the super-admin dashboard:
 * - totalUsers, activeUsers
 * - auditLogsCount (this month)
 * - userRoleDistribution (role → count)
 * - recentAuditLogs (last 10)
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

    // Check super_admin or admin role
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

    if (!role || !['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Run queries in parallel
    const [
      totalUsersResult,
      activeUsersResult,
      auditLogsResult,
      roleDistResult,
      recentLogsResult,
    ] = await Promise.all([
      // Total users (non-deleted)
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),

      // Active users (status = 'active')
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('status', 'active'),

      // Audit logs this month
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),

      // User role distribution
      supabase
        .from('users')
        .select('role')
        .is('deleted_at', null),

      // Recent audit logs (last 10)
      supabase
        .from('audit_logs')
        .select('id, user_id, action, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const totalUsers = totalUsersResult.count ?? 0;
    const activeUsers = activeUsersResult.count ?? 0;
    const auditLogsCount = auditLogsResult.count ?? 0;

    // Calculate role distribution
    const roleCounts: Record<string, number> = {};
    if (roleDistResult.data) {
      for (const row of roleDistResult.data) {
        const r = (row as { role: string }).role;
        roleCounts[r] = (roleCounts[r] || 0) + 1;
      }
    }

    const userRoleDistribution = Object.entries(roleCounts)
      .map(([roleName, count]) => ({
        role: roleName,
        count,
        percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Format recent audit logs
    const recentAuditLogs = (recentLogsResult.data ?? []).map(
      (log: { id: string; user_id: string | null; action: string; metadata: Record<string, unknown> | null; created_at: string }) => {
        const meta = log.metadata as Record<string, unknown> | null;
        return {
          id: log.id,
          userId: log.user_id,
          action: log.action,
          details: meta?.description ?? meta?.details ?? '',
          timestamp: log.created_at,
        };
      }
    );

    return NextResponse.json({
      data: {
        totalUsers,
        activeUsers,
        auditLogsCount,
        userRoleDistribution,
        recentAuditLogs,
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard/super-admin-stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
