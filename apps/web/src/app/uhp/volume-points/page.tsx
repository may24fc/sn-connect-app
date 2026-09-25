import { isUhpAdmin, requireUhpModule } from '@/app/api/uhp/_lib';
import { SelfServiceLayoutShell } from '@/components/layout/SelfServiceLayoutShell';
import { UhpVolumePointsPage } from '@/components/uhp/UhpVolumePointsPage';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) return notFound();
  return (
    <SelfServiceLayoutShell allowedRoles={['employee', 'associate', 'admin', 'super_admin']}>
      <UhpVolumePointsPage isAdmin={isUhpAdmin(auth.context.role)} />
    </SelfServiceLayoutShell>
  );
}
