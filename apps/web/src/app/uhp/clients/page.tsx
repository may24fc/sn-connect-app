import { isUhpAdmin, requireUhpModule } from '@/app/api/uhp/_lib';
import { SelfServiceLayoutShell } from '@/components/layout/SelfServiceLayoutShell';
import { UhpClientTrackerPage } from '@/components/uhp/UhpClientTrackerPage';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return notFound();
  return (
    <SelfServiceLayoutShell allowedRoles={['employee', 'associate', 'admin', 'super_admin']}>
      <UhpClientTrackerPage isAdmin={isUhpAdmin(auth.context.role)} />
    </SelfServiceLayoutShell>
  );
}
