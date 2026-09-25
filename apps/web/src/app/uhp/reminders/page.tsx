import { isUhpAdmin, requireUhpModule } from '@/app/api/uhp/_lib';
import { SelfServiceLayoutShell } from '@/components/layout/SelfServiceLayoutShell';
import { UhpRemindersPage } from '@/components/uhp/UhpRemindersPage';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const auth = await requireUhpModule('portal_reminders');
  if (!auth.ok) return notFound();
  return (
    <SelfServiceLayoutShell allowedRoles={['employee', 'associate', 'admin', 'super_admin']}>
      <UhpRemindersPage isAdmin={isUhpAdmin(auth.context.role)} />
    </SelfServiceLayoutShell>
  );
}
