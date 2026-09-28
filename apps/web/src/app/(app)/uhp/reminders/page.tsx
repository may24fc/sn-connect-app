import { isUhpAdmin, requireUhpModule } from '@/app/api/uhp/_lib';
import { UhpRemindersPage } from '@/components/uhp/UhpRemindersPage';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const auth = await requireUhpModule('portal_reminders');
  if (!auth.ok) return notFound();
  return (
    <UhpRemindersPage isAdmin={isUhpAdmin(auth.context.role)} />
  );
}
