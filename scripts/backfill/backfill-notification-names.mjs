import fs from 'node:fs';
import path from 'node:path';

const PAGE_SIZE = 500;
const DRY_RUN = !process.argv.includes('--apply');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadEnv() {
  const cwd = process.cwd();
  const envBase = loadEnvFile(path.join(cwd, '.env'));
  const envLocal = loadEnvFile(path.join(cwd, '.env.local'));

  return {
    ...process.env,
    ...envBase,
    ...envLocal,
  };
}

function buildDisplayName(...parts) {
  return parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ');
}

function resolveDisplayName({ user, employee, onboarding }) {
  return (
    buildDisplayName(employee?.first_name, employee?.middle_name, employee?.last_name) ||
    buildDisplayName(onboarding?.first_name, onboarding?.middle_name, onboarding?.last_name) ||
    employee?.company_email?.trim() ||
    employee?.personal_email?.trim() ||
    onboarding?.company_email?.trim() ||
    onboarding?.personal_email?.trim() ||
    'Team member'
  );
}

function humanizeReportType(reportType) {
  return String(reportType || 'report').replace(/_/g, ' ');
}

function formatMonthLabel(periodStart) {
  if (!periodStart) {
    return 'this period';
  }

  const parsed = new Date(periodStart);
  if (Number.isNaN(parsed.getTime())) {
    return String(periodStart);
  }

  return parsed.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function formatLongDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getFirstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'Team member';
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return data;
}

function buildHeaders(serviceRoleKey, extraHeaders = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...extraHeaders,
  };
}

async function fetchNotifications(baseUrl, serviceRoleKey) {
  const notifications = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${baseUrl}/rest/v1/notifications`);
    url.searchParams.set('select', 'id,user_id,type,title,message,metadata,created_at');
    url.searchParams.set('order', 'created_at.asc');
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(offset));

    const batch = await requestJson(url, {
      headers: buildHeaders(serviceRoleKey),
    });

    notifications.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return notifications;
}

async function fetchByIds(baseUrl, serviceRoleKey, table, select, column, ids) {
  if (ids.length === 0) {
    return [];
  }

  const url = new URL(`${baseUrl}/rest/v1/${table}`);
  url.searchParams.set('select', select);
  url.searchParams.set(column, `in.(${ids.join(',')})`);

  return requestJson(url, {
    headers: buildHeaders(serviceRoleKey),
  });
}

async function buildContext(baseUrl, serviceRoleKey, notifications) {
  const userIds = new Set();
  const employeeIds = new Set();
  const reportIds = new Set();
  const invoiceIds = new Set();

  for (const notification of notifications) {
    userIds.add(notification.user_id);

    const metadata = notification.metadata || {};
    for (const key of ['submittedBy', 'approvedBy', 'reviewedBy', 'rejectedBy', 'reminderSentBy', 'updatedBy', 'completedBy']) {
      if (metadata[key]) {
        userIds.add(metadata[key]);
      }
    }

    if (metadata.userId) {
      userIds.add(metadata.userId);
    }

    if (metadata.employeeId) {
      employeeIds.add(metadata.employeeId);
    }

    if (metadata.reportId) {
      reportIds.add(metadata.reportId);
    }

    if (metadata.invoiceId) {
      invoiceIds.add(metadata.invoiceId);
    }
  }

  const [users, employeesByUser, employeesById, onboardingProfiles, reports, invoices] =
    await Promise.all([
      fetchByIds(
        baseUrl,
        serviceRoleKey,
        'users',
        'id,role',
        'id',
        [...userIds]
      ),
      fetchByIds(
        baseUrl,
        serviceRoleKey,
        'employees',
        'id,user_id,first_name,middle_name,last_name,company_email,personal_email',
        'user_id',
        [...userIds]
      ),
      fetchByIds(
        baseUrl,
        serviceRoleKey,
        'employees',
        'id,user_id,first_name,middle_name,last_name,company_email,personal_email',
        'id',
        [...employeeIds]
      ),
      fetchByIds(
        baseUrl,
        serviceRoleKey,
        'onboarding_profiles',
        'user_id,first_name,middle_name,last_name,company_email,personal_email',
        'user_id',
        [...userIds]
      ),
      fetchByIds(baseUrl, serviceRoleKey, 'reports', 'id,report_type', 'id', [...reportIds]),
      fetchByIds(baseUrl, serviceRoleKey, 'invoices', 'id,net_amount,status,notes', 'id', [...invoiceIds]),
    ]);

  const userById = new Map(users.map((row) => [row.id, row]));
  const employeeByUserId = new Map(
    employeesByUser.filter((row) => row.user_id).map((row) => [row.user_id, row])
  );
  const onboardingByUserId = new Map(
    onboardingProfiles.filter((row) => row.user_id).map((row) => [row.user_id, row])
  );
  const employeeById = new Map(employeesById.map((row) => [row.id, row]));
  const reportById = new Map(reports.map((row) => [row.id, row]));
  const invoiceById = new Map(invoices.map((row) => [row.id, row]));

  function getUserIdentity(userId) {
    if (!userId) {
      return null;
    }

    const user = userById.get(userId);
    const employee = employeeByUserId.get(userId);
    const onboarding = onboardingByUserId.get(userId);

    return {
      userId,
      displayName: resolveDisplayName({ user, employee, onboarding }),
      firstName:
        employee?.first_name || onboarding?.first_name || getFirstName(resolveDisplayName({ user, employee, onboarding })),
      employeeId: employee?.id || null,
    };
  }

  function getEmployeeName(employeeId) {
    const employee = employeeById.get(employeeId);
    if (!employee) {
      return null;
    }

    return buildDisplayName(employee.first_name, employee.middle_name, employee.last_name) || 'Team member';
  }

  return {
    getUserIdentity,
    getEmployeeName,
    reportById,
    invoiceById,
  };
}

function buildReplacement(notification, context) {
  const metadata = notification.metadata || {};
  const recipient = context.getUserIdentity(notification.user_id);

  switch (notification.type) {
    case 'onboarding_step': {
      const subject = context.getUserIdentity(metadata.userId);
      return subject
        ? `${subject.displayName} has completed their onboarding and is awaiting approval`
        : null;
    }
    case 'onboarding_approved': {
      const actor = context.getUserIdentity(metadata.approvedBy);
      return actor ? `${actor.displayName} approved your onboarding. Your account is now active!` : null;
    }
    case 'onboarding_rejected': {
      const actor = context.getUserIdentity(metadata.rejectedBy);
      if (!actor) {
        return null;
      }

      return `${actor.displayName} rejected your onboarding${metadata.notes ? `. Reason: ${metadata.notes}` : ''}`;
    }
    case 'report_submitted': {
      const actor = context.getUserIdentity(metadata.submittedBy);
      const reportType = humanizeReportType(context.reportById.get(metadata.reportId)?.report_type);
      return actor ? `${actor.displayName} submitted a ${reportType} for review` : null;
    }
    case 'report_approved':
    case 'report_rejected': {
      const actor = context.getUserIdentity(metadata.reviewedBy);
      const reportType = humanizeReportType(context.reportById.get(metadata.reportId)?.report_type);
      const verb = notification.type === 'report_approved' ? 'approved' : 'rejected';
      return actor ? `${actor.displayName} ${verb} your ${reportType}` : null;
    }
    case 'invoice_submitted': {
      const actor = context.getUserIdentity(metadata.submittedBy);
      const invoice = context.invoiceById.get(metadata.invoiceId);
      return actor ? `${actor.displayName} submitted an invoice for PHP ${invoice?.net_amount || 0} for approval` : null;
    }
    case 'invoice_approved':
    case 'invoice_rejected': {
      const actor = context.getUserIdentity(metadata.approvedBy);
      const invoice = context.invoiceById.get(metadata.invoiceId);
      const verb = notification.type === 'invoice_approved' ? 'approved' : 'rejected';
      const notes = invoice?.notes ? `: ${invoice.notes}` : '';
      return actor
        ? `${actor.displayName} ${verb} your invoice for PHP ${invoice?.net_amount || 0}${notes}`
        : null;
    }
    case 'intern_log_submitted': {
      const actor = context.getUserIdentity(metadata.submittedBy);
      return actor && metadata.logDate
        ? `${actor.displayName} submitted a daily log for ${metadata.logDate}`
        : null;
    }
    case 'intern_log_approved': {
      const actor = context.getUserIdentity(metadata.approvedBy);
      return actor && metadata.logDate
        ? `${actor.displayName} approved your daily log for ${metadata.logDate}`
        : null;
    }
    case 'probation_update': {
      const employeeName = context.getEmployeeName(metadata.employeeId) || recipient?.displayName;

      if (metadata.action === 'extend' && metadata.newProbationEndDate) {
        const actor = context.getUserIdentity(metadata.updatedBy);
        const formattedDate = formatLongDate(metadata.newProbationEndDate);
        if (!formattedDate) {
          return null;
        }

        if (actor) {
          return metadata.recipientType === 'admin' || recipient?.displayName !== employeeName
            ? `${actor.displayName} extended ${employeeName}'s probation period to ${formattedDate}.`
            : `${actor.displayName} extended your probation period to ${formattedDate}.`;
        }

        return employeeName ? `${employeeName}, your probation period has been extended to ${formattedDate}.` : null;
      }

      if (metadata.action === 'complete') {
        const actor = context.getUserIdentity(metadata.completedBy);
        if (actor) {
          if (recipient?.displayName === employeeName || metadata.recipientType === 'employee') {
            return typeof metadata.finalRating === 'number'
              ? `${actor.displayName} completed your probation evaluation with a final rating of ${metadata.finalRating}/5.`
              : `${actor.displayName} completed your probation evaluation.`;
          }

          return employeeName
            ? `${actor.displayName} completed ${employeeName}'s probation evaluation.`
            : null;
        }
      }

      if (metadata.milestoneType && typeof metadata.daysRemaining === 'number' && employeeName) {
        const recipientType = metadata.recipientType || 'employee';
        if (recipientType === 'employee') {
          return `${employeeName}, your probation ${metadata.daysRemaining === 0 ? 'ends today' : `ends in ${metadata.daysRemaining} days`}. Please check your dashboard for details.`;
        }
      }

      return null;
    }
    case 'reminder': {
      if (metadata.reminderSentBy && String(notification.title || '').startsWith('Reminder: ')) {
        const actor = context.getUserIdentity(metadata.reminderSentBy);
        const announcementTitle = String(notification.title).replace(/^Reminder:\s*/, '');
        return actor ? `${actor.displayName} reminded you to review "${announcementTitle}".` : null;
      }

      if (notification.title === 'Invoice Submission Reminder' && recipient) {
        const monthLabel = formatMonthLabel(metadata.periodStart);
        const daysRemaining = Number(metadata.daysRemaining || 0);
        if (metadata.invoiceId) {
          const invoice = context.invoiceById.get(metadata.invoiceId);
          return `${recipient.displayName}, you have a ${invoice?.status || 'draft'} invoice for ${monthLabel}. Please finalize and submit it. ${daysRemaining} day(s) remain until month-end.`;
        }

        return `${recipient.displayName}, no invoice was found for ${monthLabel}. Please create and submit your invoice. ${daysRemaining} day(s) remain until month-end.`;
      }

      if (typeof metadata.daysLate === 'number' && recipient) {
        if (metadata.daysLate <= 1) {
          return `${recipient.firstName}, your weekly report is due. Please submit it at your earliest convenience.`;
        }

        if (metadata.daysLate <= 3) {
          return `${recipient.firstName}, your weekly report is ${metadata.daysLate} day(s) overdue. Please submit it as soon as possible.`;
        }

        return `${recipient.firstName}, your weekly report is ${metadata.daysLate} day(s) overdue. This has been escalated to your manager.`;
      }

      if (metadata.type === 'intern_eod' && metadata.missingDate && recipient) {
        return `${recipient.firstName}, you did not submit your End-of-Day report for ${metadata.missingDate}. Please submit it.`;
      }

      return null;
    }
    case 'system': {
      if (notification.title === 'Direct Report Escalation' && metadata.employeeId) {
        const employeeName = context.getEmployeeName(metadata.employeeId);
        return employeeName && typeof metadata.daysLate === 'number'
          ? `${employeeName} has a weekly report overdue by ${metadata.daysLate} days.`
          : null;
      }

      if (notification.title === 'Associate EOD Missing' && metadata.employeeId && metadata.missingDate) {
        const employeeName = context.getEmployeeName(metadata.employeeId);
        return employeeName
          ? `${employeeName} did not submit an EOD report for ${metadata.missingDate}.`
          : null;
      }

      if (notification.title === 'Daily Log Review' && metadata.reviewedBy && metadata.logDate) {
        const actor = context.getUserIdentity(metadata.reviewedBy);
        return actor ? `${actor.displayName} reviewed your daily log for ${metadata.logDate}` : null;
      }

      return null;
    }
    default:
      return null;
  }
}

async function updateNotification(baseUrl, serviceRoleKey, notificationId, message) {
  const url = `${baseUrl}/rest/v1/notifications?id=eq.${notificationId}`;
  await requestJson(url, {
    method: 'PATCH',
    headers: buildHeaders(serviceRoleKey, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    }),
    body: JSON.stringify({ message }),
  });
}

async function main() {
  const env = loadEnv();
  const baseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!baseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const notifications = await fetchNotifications(baseUrl, serviceRoleKey);
  const context = await buildContext(baseUrl, serviceRoleKey, notifications);

  let updated = 0;
  let skipped = 0;
  const changesByType = new Map();

  for (const notification of notifications) {
    const replacement = buildReplacement(notification, context);

    if (!replacement || replacement === notification.message) {
      skipped += 1;
      continue;
    }

    changesByType.set(notification.type, (changesByType.get(notification.type) || 0) + 1);

    if (!DRY_RUN) {
      await updateNotification(baseUrl, serviceRoleKey, notification.id, replacement);
    }

    updated += 1;
  }

  console.log(JSON.stringify({
    mode: DRY_RUN ? 'dry-run' : 'apply',
    totalNotifications: notifications.length,
    updated,
    skipped,
    changesByType: Object.fromEntries(changesByType.entries()),
  }, null, 2));
}

main().catch((error) => {
  console.error('[backfill-notification-names] Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});