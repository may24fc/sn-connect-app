import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'];

/** Human-readable labels for audit log actions and table operations */
const ACTION_LABELS: Record<string, string> = {
  // Announcements
  create_announcement: 'Created an announcement',
  update_announcement: 'Updated an announcement',
  delete_announcement: 'Deleted an announcement',
  publish_announcement: 'Published an announcement',
  // Tasks
  create_task: 'Created a task',
  update_task: 'Updated a task',
  delete_task: 'Deleted a task',
  // Resources
  create_resource: 'Created a resource',
  update_resource: 'Updated a resource',
  delete_resource: 'Deleted a resource',
  // Employees
  update_employee: 'Updated an employee record',
  delete_employee: 'Deleted an employee record',
  // Reports
  approve_report: 'Approved a report',
  reject_report: 'Rejected a report',
  // Performance
  create_review_cycle: 'Created a review cycle',
  update_review_cycle: 'Updated a review cycle',
  delete_review_cycle: 'Deleted a review cycle',
  create_performance_review: 'Created a performance review',
  update_performance_review: 'Updated a performance review',
  // Knowledge base
  create_knowledge_source: 'Added a knowledge source',
  update_knowledge_source: 'Updated a knowledge source',
  delete_knowledge_source: 'Deleted a knowledge source',
  // Internships
  internship_extended: 'Extended an internship',
  // Daily logs
  create_daily_log: 'Submitted a daily log',
  update_daily_log: 'Updated a daily log',
  // AI
  create_ai_chat: 'Started an AI chat session',
  // Onboarding
  create_onboarding: 'Started an onboarding process',
  update_onboarding: 'Updated onboarding progress',
  complete_onboarding: 'Completed onboarding',
};

/** Fallback labels based on table_name + operation */
const TABLE_LABELS: Record<string, string> = {
  announcements: 'announcement',
  announcement_reads: 'announcement read',
  announcement_comments: 'announcement comment',
  announcement_attachments: 'announcement attachment',
  tasks: 'task',
  task_comments: 'task comment',
  resources: 'resource',
  resource_categories: 'resource category',
  resource_views: 'resource view',
  resource_bookmarks: 'resource bookmark',
  resource_collections: 'resource collection',
  employees: 'employee record',
  users: 'user account',
  documents: 'document',
  departments: 'department',
  reports: 'report',
  report_metrics: 'report metric',
  review_cycles: 'review cycle',
  performance_reviews: 'performance review',
  internships: 'internship',
  internship_daily_logs: 'daily log',
  onboarding_profiles: 'onboarding profile',
  onboarding_documents: 'onboarding document',
  onboarding_checklists: 'onboarding checklist',
  onboarding_tasks: 'onboarding task',
  knowledge_sources: 'knowledge source',
  knowledge_embeddings: 'knowledge embedding',
  knowledge_source_versions: 'knowledge source version',
  invoices: 'invoice',
  invoice_line_items: 'invoice line item',
  okrs: 'OKR',
  kpis: 'KPI',
  standup_recordings: 'standup recording',
  standup_topics: 'standup topic',
  notifications: 'notification',
  ai_chat: 'AI chat session',
  ai_chats: 'AI chat session',
  fx_rates: 'exchange rate',
  bank_registry: 'bank record',
  user_role_metadata: 'role metadata',
  role_kpi_entries: 'role KPI entry',
  audit_logs: 'audit log',
  collection_resources: 'collection resource',
};

const OP_VERBS: Record<string, string> = {
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
};

/** Maps table names to display categories for UI badges */
const TABLE_CATEGORIES: Record<string, { label: string; category: string }> = {
  announcements: { label: 'Announcements', category: 'announcements' },
  announcement_reads: { label: 'Announcements', category: 'announcements' },
  announcement_comments: { label: 'Announcements', category: 'announcements' },
  announcement_attachments: { label: 'Announcements', category: 'announcements' },
  tasks: { label: 'Tasks', category: 'tasks' },
  task_comments: { label: 'Tasks', category: 'tasks' },
  resources: { label: 'Resources', category: 'resources' },
  resource_categories: { label: 'Resources', category: 'resources' },
  resource_views: { label: 'Resources', category: 'resources' },
  resource_bookmarks: { label: 'Resources', category: 'resources' },
  resource_collections: { label: 'Resources', category: 'resources' },
  collection_resources: { label: 'Resources', category: 'resources' },
  employees: { label: 'Employees', category: 'employees' },
  users: { label: 'Users', category: 'employees' },
  documents: { label: 'Documents', category: 'documents' },
  departments: { label: 'Departments', category: 'organization' },
  reports: { label: 'Reports', category: 'reports' },
  report_metrics: { label: 'Reports', category: 'reports' },
  review_cycles: { label: 'Performance', category: 'performance' },
  performance_reviews: { label: 'Performance', category: 'performance' },
  okrs: { label: 'Performance', category: 'performance' },
  kpis: { label: 'Performance', category: 'performance' },
  role_kpi_entries: { label: 'Performance', category: 'performance' },
  internships: { label: 'Internships', category: 'internships' },
  internship_daily_logs: { label: 'Intern Daily Logs', category: 'internships' },
  onboarding_profiles: { label: 'Onboarding', category: 'onboarding' },
  onboarding_documents: { label: 'Onboarding', category: 'onboarding' },
  onboarding_checklists: { label: 'Onboarding', category: 'onboarding' },
  onboarding_tasks: { label: 'Onboarding', category: 'onboarding' },
  knowledge_sources: { label: 'Knowledge Sources', category: 'ai' },
  knowledge_embeddings: { label: 'AI Knowledge', category: 'ai' },
  knowledge_source_versions: { label: 'Knowledge Sources', category: 'ai' },
  ai_chat: { label: 'AI Chat', category: 'ai' },
  ai_chats: { label: 'AI Chat', category: 'ai' },
  invoices: { label: 'Invoices', category: 'finance' },
  invoice_line_items: { label: 'Invoices', category: 'finance' },
  fx_rates: { label: 'Finance', category: 'finance' },
  bank_registry: { label: 'Finance', category: 'finance' },
  standup_recordings: { label: 'Standups', category: 'standups' },
  standup_topics: { label: 'Standups', category: 'standups' },
  notifications: { label: 'Notifications', category: 'system' },
  audit_logs: { label: 'System', category: 'system' },
  user_role_metadata: { label: 'System', category: 'system' },
};

/** Formats a raw table_name into a readable label as fallback */
function formatTableName(tableName: string): string {
  return tableName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function describeActivity(row: {
  action: string | null;
  table_name: string;
  operation: string;
  metadata: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}): { description: string; detail: string } {
  const titleFromMeta =
    (row.metadata?.title as string) ||
    (row.new_values?.title as string) ||
    (row.metadata?.name as string) ||
    (row.new_values?.name as string) ||
    '';

  // Prefer explicit action label (from `action` column)
  if (row.action && ACTION_LABELS[row.action]) {
    return {
      description: ACTION_LABELS[row.action]!,
      detail: titleFromMeta ? `"${titleFromMeta}"` : '',
    };
  }

  // Try matching operation column against action labels (edge functions write action to operation)
  if (row.operation && ACTION_LABELS[row.operation]) {
    return {
      description: ACTION_LABELS[row.operation]!,
      detail: titleFromMeta ? `"${titleFromMeta}"` : '',
    };
  }

  // Fallback to table_name + operation
  const verb = OP_VERBS[row.operation] ?? 'Updated';
  const entity = TABLE_LABELS[row.table_name] ?? formatTableName(row.table_name);

  return {
    description: `${verb} a ${entity}`,
    detail: titleFromMeta ? `"${titleFromMeta}"` : '',
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
        const categoryInfo = TABLE_CATEGORIES[log.table_name];
        return {
          id: log.id,
          action: detail ? `${description}: ${detail}` : description,
          performedBy: log.performed_by
            ? userMap[log.performed_by] ?? 'System'
            : 'System',
          timestamp: log.performed_at,
          tableName: log.table_name,
          categoryLabel: categoryInfo?.label ?? formatTableName(log.table_name),
          category: categoryInfo?.category ?? 'other',
        };
      }
    );

    return NextResponse.json({ data: activities });
  } catch (error) {
    console.error('GET /api/audit-logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
