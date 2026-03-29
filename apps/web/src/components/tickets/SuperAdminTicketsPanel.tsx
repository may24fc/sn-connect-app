'use client';

import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { useTicketAssignees } from '@/hooks/useTicketAssignees';
import { useTickets, useUpdateTicket, type TicketRecord } from '@/hooks/useTickets';
import { Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hr-portal/ui';
import { CheckCircle2, ClipboardList, Clock, Loader2, Search } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useMemo, useState } from 'react';
import { TicketAssignmentDialog } from './TicketAssignmentDialog';
import { TicketListTable } from './TicketListTable';
import { TICKET_STATUS_OPTIONS, TICKET_TEAM_OPTIONS } from './ticket-badges';

type TicketStatusFilter = 'all' | 'new' | 'triaged' | 'assigned' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';

export function SuperAdminTicketsPanel(): ReactNode {
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState<'all' | 'hr' | 'it'>('all');
  const [status, setStatus] = useState<TicketStatusFilter>('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);

  const filters = {
    scope: 'triage' as const,
    ...(search ? { search } : {}),
    ...(team !== 'all' ? { team } : {}),
    ...(status !== 'all' ? { status } : {}),
    page: 1,
    pageSize: 100,
  };

  const { data, isLoading, error } = useTickets(filters);
  const { data: assigneesData } = useTicketAssignees();
  const updateTicket = useUpdateTicket();
  const tickets = data?.data ?? [];

  const stats = useMemo(
    () => ({
      total: tickets.length,
      newCount: tickets.filter((ticket) => ticket.status === 'new').length,
      assigned: tickets.filter((ticket) => ticket.status === 'assigned' || ticket.status === 'in_progress').length,
      resolved: tickets.filter((ticket) => ticket.status === 'resolved' || ticket.status === 'closed').length,
    }),
    [tickets]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Ticket Intake</h2>
          <p className="text-sm text-muted-foreground">
            Triage employee HR and IT tickets, then dispatch them to the correct handler.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/employee-management">Manage IT Handlers</Link>
        </Button>
      </div>

      <StatCardGrid columns={4}>
        <StatCard label="All Tickets" value={stats.total} icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="New" value={stats.newCount} icon={<Clock className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="Assigned" value={stats.assigned} icon={<Loader2 className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />} />
      </StatCardGrid>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tickets..." className="pl-10" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={team} onValueChange={(value) => setTeam(value as typeof team)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {TICKET_TEAM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setStatus(value as TicketStatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {TICKET_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading tickets...</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">{error.message}</CardContent>
        </Card>
      ) : (
        <TicketListTable
          tickets={tickets}
          emptyTitle="No tickets in the intake queue"
          emptyDescription="New employee HR and IT tickets will appear here for triage and dispatch."
          showSubmittedBy
          showAssignedTo
          actionLabel="Triage"
          onAction={setSelectedTicket}
        />
      )}

      <TicketAssignmentDialog
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicket(null);
          }
        }}
        ticket={selectedTicket}
        assignees={assigneesData?.data ?? []}
        isPending={updateTicket.isPending}
        onSubmit={async (payload) => {
          if (!selectedTicket) {
            return;
          }

          await updateTicket.mutateAsync({
            id: selectedTicket.id,
            payload,
          });
        }}
      />
    </div>
  );
}