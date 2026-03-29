import { formatLabel } from '@/lib/format';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;

type AdminRole = (typeof ADMIN_ROLES)[number];
type ActivityScope = 'admin' | 'super_admin';

const SCOPE_ACTOR_ROLE: Record<ActivityScope, AdminRole> = {
  admin: 'admin',
  super_admin: 'super_admin',
};

const SCOPE_INCLUDES_SYSTEM_ACTIVITY: Record<ActivityScope, boolean> = {
  admin: false,
  super_admin: true,
};

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
  ai_chat_suggestion_click: 'Clicked an AI chat suggestion',
  // Onboarding
  approve_onboarding: 'Approved onboarding',
  reject_onboarding: 'Rejected onboarding',
  approve_onabording: 'Approved onboarding',
  reject_onabording: 'Rejected onboarding',
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
  okr_targets: 'OKR target',
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

const IGNORED_CHANGE_FIELDS = new Set(['updated_at', 'created_at']);

const SENSITIVE_CHANGE_FIELDS = new Set([
  'payroll_account_name',
  'payroll_account_number',
  'birthday',
  'phone',
  'emergency_contact_name',
  'emergency_contact_number',
  'personal_email',
  'company_email',
  'address',
  'city',
  'province',
  'postal_code',
]);

const FIELD_LABELS: Record<string, string> = {
  role: 'role',
  status: 'status',
  manager_id: 'manager',
  department_id: 'department',
  immediate_head: 'manager',
  employment_type: 'employment type',
  work_arrangement: 'work arrangement',
  position: 'position',
  department: 'department',
  probation_end_date: 'probation end date',
  deleted_at: 'account status',
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
  okr_targets: { label: 'Performance', category: 'performance' },
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
  return formatLabel(tableName);
}

function normalizeAction(action: string): string {
  return formatLabel(action);
}

function isAdminRole(role: string | null): role is AdminRole {
  return typeof role === 'string' && ADMIN_ROLES.includes(role as AdminRole);
}

function resolveActivityScope(rawScope: string | null, role: AdminRole): ActivityScope | null {
  if (!rawScope) {
    return role === 'super_admin' ? 'super_admin' : 'admin';
  }

  if (rawScope !== 'admin' && rawScope !== 'super_admin') {
    return null;
  }

  if (rawScope === 'super_admin' && role !== 'super_admin') {
    return null;
  }

  return rawScope;
}

async function getScopedActorIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  actorRole: AdminRole
): Promise<string[]> {
  const { data: scopedUsers, error: scopeUserError } = await supabase
    .from('users')
    .select('id')
    .eq('role', actorRole)
    .is('deleted_at', null);

  if (scopeUserError) {
    throw scopeUserError;
  }

  return (scopedUsers ?? []).map((scopedUser: { id: string }) => scopedUser.id);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getStringValue(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return '';
}

function getFullName(record: Record<string, unknown>): string {
  const firstName = typeof record.first_name === 'string' ? record.first_name.trim() : '';
  const lastName = typeof record.last_name === 'string' ? record.last_name.trim() : '';
  return [firstName, lastName].filter(Boolean).join(' ');
}

function getChangedFields(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null
): string[] {
  const oldRecord = asRecord(oldValues);
  const newRecord = asRecord(newValues);
  const keys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);

  const changed = [...keys].filter((key) => {
    if (IGNORED_CHANGE_FIELDS.has(key)) return false;
    return oldRecord[key] !== newRecord[key];
  });

  return changed;
}

function buildSubject(row: {
  table_name: string;
  record_id: string;
  metadata: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
}): string {
  const metadata = asRecord(row.metadata);
  const newValues = asRecord(row.new_values);
  const oldValues = asRecord(row.old_values);

  const fullName =
    getFullName(metadata) ||
    getFullName(newValues) ||
    getFullName(oldValues);

  const titleLike =
    getStringValue(metadata, ['title', 'name', 'employeeName', 'resourceTitle', 'reportTitle']) ||
    getStringValue(newValues, ['title', 'name']) ||
    getStringValue(oldValues, ['title', 'name']);

  const emailLike =
    getStringValue(metadata, ['email', 'userEmail', 'company_email', 'personal_email']) ||
    getStringValue(newValues, ['email', 'company_email', 'personal_email']) ||
    getStringValue(oldValues, ['email', 'company_email', 'personal_email']);

  if (fullName) return fullName;
  if (titleLike) return titleLike;
  if (emailLike) return emailLike;

  if (row.table_name === 'users') {
    return `user ${row.record_id.slice(0, 8)}`;
  }

  return '';
}

function buildChangeSummary(changedFields: string[]): string {
  if (changedFields.length === 0) return '';

  const safeFields = changedFields.filter((field) => !SENSITIVE_CHANGE_FIELDS.has(field));
  const hasSensitive = changedFields.some((field) => SENSITIVE_CHANGE_FIELDS.has(field));

  const formattedSafe = safeFields
    .slice(0, 3)
    .map((field) => FIELD_LABELS[field] ?? field.replace(/_/g, ' '));

  const parts: string[] = [];
  if (formattedSafe.length > 0) {
    parts.push(`changed ${formattedSafe.join(', ')}`);
  }
  if (hasSensitive) {
    parts.push('updated sensitive profile details');
  }

  return parts.join(' and ');
}

function buildFallbackDescription(row: {
  table_name: string;
  operation: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  record_id: string;
}): { description: string; detail: string } {
  const subject = buildSubject(row);
  const changedFields = getChangedFields(row.old_values, row.new_values);
  const changeSummary = buildChangeSummary(changedFields);

  if (row.table_name === 'users') {
    if (changedFields.includes('role')) {
      return {
        description: 'Updated user role',
        detail: subject ? `for ${subject}` : '',
      };
    }

    if (changedFields.includes('status')) {
      return {
        description: 'Updated user status',
        detail: subject ? `for ${subject}` : '',
      };
    }

    if (changedFields.includes('deleted_at')) {
      const newValues = asRecord(row.new_values);
      const isSoftDeleted = Boolean(newValues.deleted_at);
      return {
        description: isSoftDeleted ? 'Deactivated user account' : 'Reactivated user account',
        detail: subject ? `for ${subject}` : '',
      };
    }
  }

  const verb = OP_VERBS[row.operation] ?? 'Updated';
  const entity = TABLE_LABELS[row.table_name] ?? formatTableName(row.table_name);
  const article = /^[aeiou]/i.test(entity) ? 'an' : 'a';
  const description = `${verb} ${article} ${entity}`;

  const detailParts: string[] = [];
  if (subject) {
    detailParts.push(`for ${subject}`);
  }
  if (changeSummary && row.operation === 'UPDATE') {
    detailParts.push(changeSummary);
  }

  return {
    description,
    detail: detailParts.join(' - '),
  };
}

function describeActivity(row: {
  action: string | null;
  table_name: string;
  record_id: string;
  operation: string;
  metadata: Record<string, unknown> | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}): { description: string; detail: string } {
  const subject = buildSubject(row);
  const changedFields = getChangedFields(row.old_values, row.new_values);
  const changeSummary = buildChangeSummary(changedFields);

  // Prefer explicit action label (from `action` column)
  if (row.action && ACTION_LABELS[row.action]) {
    const detailParts: string[] = [];
    if (subject) detailParts.push(`for ${subject}`);
    if (changeSummary && row.operation === 'UPDATE') detailParts.push(changeSummary);

    return {
      description: ACTION_LABELS[row.action]!,
      detail: detailParts.join(' - '),
    };
  }

  // Try matching operation column against action labels (edge functions write action to operation)
  if (row.operation && ACTION_LABELS[row.operation]) {
    const detailParts: string[] = [];
    if (subject) detailParts.push(`for ${subject}`);
    if (changeSummary && row.operation === 'UPDATE') detailParts.push(changeSummary);

    return {
      description: ACTION_LABELS[row.operation]!,
      detail: detailParts.join(' - '),
    };
  }

  if (row.action) {
    const detailParts: string[] = [];
    if (subject) detailParts.push(`for ${subject}`);
    if (changeSummary && row.operation === 'UPDATE') detailParts.push(changeSummary);

    return {
      description: normalizeAction(row.action),
      detail: detailParts.join(' - '),
    };
  }

  // Fallback to table_name + operation
  return buildFallbackDescription(row);
}

/**
 * GET /api/audit-logs
 * Fetches recent audit log entries for the current admin user.
 * Query params:
 *   - limit (default 10, max 50)
 *   - own (if "true", only show the current user's activity)
 *   - scope (`admin` or `super_admin`; defaults to the current user's dashboard scope)
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

    if (!isAdminRole(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get('limit') || '10');
    const limit = Math.min(Math.max(1, limitParam), 50);
    const ownOnly = url.searchParams.get('own') === 'true';
    const scopeParam = url.searchParams.get('scope');

    if (scopeParam && scopeParam !== 'admin' && scopeParam !== 'super_admin') {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }

    const scope = resolveActivityScope(scopeParam, role);

    if (!scope) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let query = supabase
      .from('audit_logs')
      .select('id, table_name, record_id, operation, action, metadata, old_values, new_values, performed_by, performed_at')
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (ownOnly) {
      query = query.eq('performed_by', user.id);
    } else {
      const actorIds = await getScopedActorIds(supabase, SCOPE_ACTOR_ROLE[scope]);
      const includeSystemActivity = SCOPE_INCLUDES_SYSTEM_ACTIVITY[scope];

      if (actorIds.length === 0 && !includeSystemActivity) {
        return NextResponse.json({ data: [] });
      }

      if (actorIds.length === 0) {
        query = query.is('performed_by', null);
      } else if (includeSystemActivity) {
        query = query.or(`performed_by.in.(${actorIds.join(',')}),performed_by.is.null`);
      } else {
        query = query.in('performed_by', actorIds);
      }
    }

    const { data: logs, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching audit logs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }

    // Get unique actor and target user IDs to fetch display names
    const userIds = [
      ...new Set(
        (logs ?? []).flatMap((log: Record<string, unknown>) => {
          const ids: string[] = [];

          if (typeof log.performed_by === 'string' && log.performed_by.length > 0) {
            ids.push(log.performed_by);
          }

          if (log.table_name === 'users' && typeof log.record_id === 'string' && log.record_id.length > 0) {
            ids.push(log.record_id);
          }

          return ids;
        })
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
        old_values: Record<string, unknown> | null;
        new_values: Record<string, unknown> | null;
        performed_by: string | null;
        performed_at: string;
      }) => {
        const metadata = asRecord(log.metadata);
        const existingSubject =
          getFullName(metadata) ||
          getStringValue(metadata, ['title', 'name', 'employeeName', 'resourceTitle', 'reportTitle']) ||
          getStringValue(metadata, ['email', 'userEmail', 'company_email', 'personal_email']);

        const enrichedLog =
          log.table_name === 'users' && !existingSubject && userMap[log.record_id]
            ? {
                ...log,
                metadata: {
                  ...metadata,
                  name: userMap[log.record_id],
                },
              }
            : log;

        const { description, detail } = describeActivity(enrichedLog);
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
