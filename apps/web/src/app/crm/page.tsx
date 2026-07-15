import { notFound } from 'next/navigation';
import AdminCrmPage from '@/app/(admin)/admin/crm/page';
import { getCrmAuthedContext } from '@/app/api/crm/_lib';
import { SelfServiceLayoutShell } from '@/components/layout/SelfServiceLayoutShell';

export default async function CrmPage() {
  const auth = await getCrmAuthedContext();

  if (!auth.ok) {
    // Keep behavior consistent with protected routes — return 404 when unauthorized.
    return notFound();
  }

  return (
    <SelfServiceLayoutShell allowedRoles={['employee', 'associate', 'admin', 'super_admin']}>
      <AdminCrmPage allowedTrackers={auth.context.grantedTrackers} />
    </SelfServiceLayoutShell>
  );
}

