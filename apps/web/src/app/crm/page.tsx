import { notFound } from 'next/navigation';
import { CrmPageContent } from '@/components/crm/CrmPageContent';
import { getCrmAuthedContext } from '@/app/api/crm/_lib';
import { SelfServiceLayoutShell } from '@/components/layout/SelfServiceLayoutShell';

export const dynamic = 'force-dynamic';

export default async function CrmPage() {
  const auth = await getCrmAuthedContext();

  if (!auth.ok) {
    // Keep behavior consistent with protected routes — return 404 when unauthorized.
    return notFound();
  }

  return (
    <SelfServiceLayoutShell allowedRoles={['employee', 'associate', 'admin', 'super_admin']}>
      <CrmPageContent allowedTrackers={auth.context.grantedTrackers} />
    </SelfServiceLayoutShell>
  );
}

