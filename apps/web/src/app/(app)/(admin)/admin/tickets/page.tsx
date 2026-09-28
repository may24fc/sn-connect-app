'use client';

import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { TicketListTable } from '@/components/tickets/TicketListTable';
import { TicketWorkDialog } from '@/components/tickets/TicketWorkDialog';
import { useTickets, useUpdateTicket, type TicketRecord } from '@/hooks/useTickets';
import { Card, CardContent, EmptyState } from '@hr-portal/ui';
import { AlertCircle, CheckCircle2, ClipboardList, Loader2, UserCog } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

export default function AdminTicketsPage(): ReactNode {
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const { data, isLoading, error } = useTickets({
    scope: 'assigned',
    team: 'hr',
    page: 1,
    pageSize: 100,
  });
  const updateTicket = useUpdateTicket();
  const tickets = data?.data ?? [];

  const stats = useMemo(
    () => ({
      total: tickets.length,
      active: tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length,
      waiting: tickets.filter((ticket) => ticket.status === 'waiting_on_user').length,
      resolved: tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
    }),
    [tickets]
  );

  return (
    <div className="space-y-6 p-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tickets</h1>
        <p className="text-sm text-muted-foreground">
          Work the HR tickets assigned to you without exposing the super-admin intake queue.
        </p>
      </div>

      <StatCardGrid columns={4}>
        <StatCard label="Assigned HR Tickets" value={stats.total} icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="Active" value={stats.active} icon={<Loader2 className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="Waiting on User" value={stats.waiting} icon={<UserCog className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />} />
      </StatCardGrid>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<Loader2 className="h-5 w-5 animate-spin" />}
              title="Loading assigned HR tickets"
              description="Retrieving the HR tickets currently assigned to you."
              size="sm"
            />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Failed to load assigned HR tickets"
              description={error.message}
              size="sm"
            />
          </CardContent>
        </Card>
      ) : (
        <TicketListTable
          tickets={tickets}
          emptyTitle="No HR tickets assigned"
          emptyDescription="Assigned HR tickets will appear here when super-admin dispatches them to you."
          showSubmittedBy
          actionLabel="Update"
          onAction={setSelectedTicket}
        />
      )}

      <TicketWorkDialog
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicket(null);
          }
        }}
        ticket={selectedTicket}
        isPending={updateTicket.isPending}
        onSubmit={async (payload) => {
          if (!selectedTicket) {
            return;
          }

          await updateTicket.mutateAsync({ id: selectedTicket.id, payload });
        }}
      />
    </div>
  );
}