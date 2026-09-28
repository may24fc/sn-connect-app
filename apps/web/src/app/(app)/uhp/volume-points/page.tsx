import { isUhpAdmin, requireUhpModule } from '@/app/api/uhp/_lib';
import { UhpVolumePointsPage } from '@/components/uhp/UhpVolumePointsPage';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) return notFound();
  return (
    <UhpVolumePointsPage isAdmin={isUhpAdmin(auth.context.role)} />
  );
}
