import { notFound } from 'next/navigation';
import { CrmPageContent } from '@/components/crm/CrmPageContent';
import { getCrmAuthedContext } from '@/app/api/crm/_lib';

export const dynamic = 'force-dynamic';

export default async function CrmPage() {
  const auth = await getCrmAuthedContext();

  if (!auth.ok) {
    // Keep behavior consistent with protected routes — return 404 when unauthorized.
    return notFound();
  }

  return (
    <CrmPageContent allowedTrackers={auth.context.grantedTrackers} />
  );
}

