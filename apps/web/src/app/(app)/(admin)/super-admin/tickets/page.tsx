import { SuperAdminTicketsPanel } from '@/components/tickets/SuperAdminTicketsPanel';
import type { ReactNode } from 'react';

export default function SuperAdminTicketsPage(): ReactNode {
  return (
    <div className="p-3">
      <SuperAdminTicketsPanel headingLevel="h1" />
    </div>
  );
}
