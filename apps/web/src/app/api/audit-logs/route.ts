import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'];

/** Human-readable labels for audit log actions and table operations */
const ACTION_LABELS: Record<string, string> = {
  // Manual action labels
  create_announcement: 'Created an announcement',
  update_announcement: 'Updated an announcement',
  delete_announcement: 'Deleted an announcement',
  publish_announcement: 'Published an announcement',
  create_task: 'Created a task',
  update_task: 'Updated a task',
  delete_task: 'Deleted a task',
  create_resource: 'Created a resource',
  update_resource: 'Updated a resource',
  delete_resource: 'Deleted a resource',
  update_employee: 'Updated an employee record',
  delete_employee: 'Deleted an employee record',
  approve_report: 'Approved a report',
  reject_report: 'Rejected a report',
  create_review_cycle: 'Created a review cycle',
  update_review_cycle: 'Updated a review cycle',
  delete_review_cycle: 'Deleted a review cycle',
  create_performance_review: 'Created a performance review',
  update_performance_review: 'Updated a performance review',
  create_knowledge_source: 'Added a knowledge source',
  update_knowledge_source: 'Updated a knowledge source',
  delete_knowledge_source: 'Deleted a knowledge source',
  internship_extended: 'Extended an internship',
};

/** Fallback labels based on table_name + operation */
const TABLE_LABELS: Record<string, string> = {
  announcements: 'announcement',
  tasks: 'task',
  resources: 'resource',
  employees: 'employee record',
  users: 'user account',
  documents: 'document',
  departments: 'department',
  reports: 'report',
  review_cycles: 'review cycle',
  performance_reviews: 'performance review',
  internships: 'internship',
  onboarding_profiles: 'onboarding profile',
  knowledge_sources: 'knowledge source',
  invoices: 'invoice',
  okrs: 'OKR',
  kpis: 'KPI',
};

const OP_VERBS: Record<string, string> = {
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
};

function describeActivity(row: {
  action: string | null;
  table_name: string;
  operation: string;
  metadata: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}): { description: string; detail: string } {
  // Prefer explicit action label
  if (row.action && ACTION_LABELS[row.action]) {
    const title =
      (row.metadata?.title as string) ||
      (row.new_values?.title as string) ||
      (row.metadata?.name as string) ||
      (row.new_values?.name as string) ||
      '';
    return {
      description: ACTION_LABELS[row.action]!,
      detail: title ? `"${title}"` : '',
    };
  }

  // Fallback to table_name + operation
  const verb = OP_VERBS[row.operation] ?? row.operation;
  const entity = TABLE_LABELS[row.table_name] ?? row.table_name;
  const title =
    (row.new_values?.title as string) ||
    (row.new_values?.name as string) ||
    '';

  return {
    description: `${verb} a ${entity}`,
    detail: title ? `"${title}"` : '',
  };
}

/**
 * GET /api/audit-logs
 * Fetches recent audit log entries for the current admin user.
 * Query params:
 *   - limit (default 10, max 50)
 *   - own (if "true", only show the current user's activity)
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
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

    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get('limit') || '10');
    const limit = Math.min(Math.max(1, limitParam), 50);
    const ownOnly = url.searchParams.get('own') === 'true';

    let query = supabase
      .from('audit_logs')
      .select('id, table_name, record_id, operation, action, metadata, new_values, performed_by, performed_at')
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (ownOnly) {
      query = query.eq('performed_by', user.id);
    }

    const { data: logs, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching audit logs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }

    // Get unique user IDs to fetch display names
    const userIds = [
      ...new Set(
        (logs ?? [])
          .map((l: Record<string, unknown>) => l.performed_by as string | null)
          .filter(Boolean)
      ),
    ] as string[];

    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (users) {
        for (const u of users) {
          const name =
            [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Unknown';
          userMap[u.id] = name;
        }
      }
    }

    const activities = (logs ?? []).map(
      (log: {
        id: string;
        table_name: string;
        record_id: string;
        operation: string;
        action: string | null;
        metadata: Record<string, unknown> | null;
        new_values: Record<string, unknown> | null;
        performed_by: string | null;
        performed_at: string;
      }) => {
        const { description, detail } = describeActivity(log);
        return {
          id: log.id,
          action: detail ? `${description}: ${detail}` : description,
          performedBy: log.performed_by
            ? userMap[log.performed_by] ?? 'Unknown'
            : 'System',
          timestamp: log.performed_at,
          tableName: log.table_name,
        };
      }
    );

    return NextResponse.json({ data: activities });
  } catch (error) {
    console.error('GET /api/audit-logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
