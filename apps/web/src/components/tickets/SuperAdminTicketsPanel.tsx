'use client';

import { ServerPagination } from '@/components/data-display/ServerPagination';
import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { useTicketAssignees } from '@/hooks/useTicketAssignees';
import { useTickets, useUpdateTicket, type TicketRecord } from '@/hooks/useTickets';
import { Button, Card, CardContent, EmptyState, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, PageEyebrow } from '@hr-portal/ui';
import { AlertCircle, CheckCircle2, ClipboardList, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useMemo, useState } from 'react';
import { TicketAssignmentDialog } from './TicketAssignmentDialog';
import { TicketListTable } from './TicketListTable';
import { TICKET_STATUS_OPTIONS, TICKET_TEAM_OPTIONS } from './ticket-badges';
import { FilterSearchInput } from '@/components/data-display/FilterControls';

type TicketStatusFilter = 'all' | 'new' | 'triaged' | 'assigned' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';

const PAGE_SIZE = 25;

export function SuperAdminTicketsPanel({
  headingLevel = 'h2',
}: {
  headingLevel?: 'h1' | 'h2';
}): ReactNode {
  const Heading = headingLevel;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState<'all' | 'hr' | 'it'>('all');
  const [status, setStatus] = useState<TicketStatusFilter>('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);

  const filters = {
    scope: 'triage' as const,
    ...(search ? { search } : {}),
    ...(team !== 'all' ? { team } : {}),
    ...(status !== 'all' ? { status } : {}),
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isFetching, error } = useTickets(filters);
  const { data: assigneesData } = useTicketAssignees();
  const updateTicket = useUpdateTicket();
  const tickets = data?.data ?? [];
  const pagination = data?.pagination;

  // Counts cover the whole intake queue, not just the loaded page.
  const stats = useMemo(
    () => ({
      total: data?.stats?.total ?? 0,
      newCount: data?.stats?.new ?? 0,
      assigned: (data?.stats?.assigned ?? 0) + (data?.stats?.in_progress ?? 0),
      resolved: (data?.stats?.resolved ?? 0) + (data?.stats?.closed ?? 0),
    }),
    [data?.stats]
  );

  // A filter change narrows the result set; keeping the old page could land on
  // a page that no longer exists.
  const resetToFirstPage = (): void => setPage(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {headingLevel === 'h1' ? <PageEyebrow /> : null}
          <Heading className="text-2xl font-bold tracking-tight text-foreground">Ticket Intake</Heading>
          <p className="mt-1 text-sm text-muted-foreground">
            Triage employee HR and IT tickets, then dispatch them to the correct handler.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/employee-management?tab=it-handlers">Manage IT Handlers</Link>
        </Button>
      </div>

      <StatCardGrid columns={4}>
        <StatCard label="All Tickets" value={stats.total} icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="New" value={stats.newCount} icon={<Clock className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="Assigned" value={stats.assigned} icon={<Loader2 className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />} />
      </StatCardGrid>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterSearchInput
          placeholder="Search tickets..."
          value={search}
          onChange={(value) => {
              resetToFirstPage();
              setSearch(value);
            }}
          maxLength={200}
          className="sm:w-auto sm:flex-1"
        />
        <div className="flex flex-wrap gap-3">
          <Select
            value={team}
            onValueChange={(value) => {
              resetToFirstPage();
              setTeam(value as typeof team);
            }}
          >
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
          <Select
            value={status}
            onValueChange={(value) => {
              resetToFirstPage();
              setStatus(value as TicketStatusFilter);
            }}
          >
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
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<Loader2 className="h-5 w-5 animate-spin" />}
              title="Loading tickets"
              description="Retrieving the intake queue for triage and assignment."
              size="sm"
            />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Failed to load tickets"
              description={error.message}
              size="sm"
            />
          </CardContent>
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

      <ServerPagination
        pagination={pagination}
        onPageChange={setPage}
        isLoading={isFetching}
        itemLabel="tickets"
      />

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
