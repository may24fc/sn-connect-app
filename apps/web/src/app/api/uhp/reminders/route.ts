import { UHP_REMINDER_LABELS } from '@/lib/uhp';
import { getNextMonday, getUhpReminderOccurrences } from '@/lib/uhp-reminders';
import { NextResponse } from 'next/server';
import { requireUhpModule } from '../_lib';

export async function GET() {
  const auth = await requireUhpModule('portal_reminders');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const now = new Date();
  const candidates = [
    ...getUhpReminderOccurrences(now.getUTCFullYear(), now.getUTCMonth()),
    ...getUhpReminderOccurrences(
      now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear(),
      (now.getUTCMonth() + 1) % 12
    ),
  ];
  const today = now.toISOString().slice(0, 10);
  const definitions = candidates
    .filter((candidate) => candidate.deliveryDate >= today)
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  const nextMonday = getNextMonday(now).toISOString().slice(0, 10);
  const { data: runs, error } = await auth.context.admin
    .from('uhp_reminder_runs')
    .select('*')
    .order('scheduled_for', { ascending: false })
    .limit(50);
  if (error)
    return NextResponse.json({ error: 'Failed to load reminder history' }, { status: 500 });
  return NextResponse.json({
    data: {
      timezone: 'Asia/Manila',
      deliveryTime: '08:00',
      definitions: [
        {
          type: 'ten_customer_form',
          label: UHP_REMINDER_LABELS.ten_customer_form,
          next: definitions.find((item) => item.type === 'ten_customer_form') ?? null,
        },
        {
          type: 'checks_deposits',
          label: UHP_REMINDER_LABELS.checks_deposits,
          next: definitions.find((item) => item.type === 'checks_deposits') ?? null,
        },
        {
          type: 'ro_group_report',
          label: UHP_REMINDER_LABELS.ro_group_report,
          next: { type: 'ro_group_report', deadlineDate: nextMonday, deliveryDate: nextMonday },
        },
      ],
      runs: runs ?? [],
    },
  });
}
