'use client';

import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { TicketListTable } from '@/components/tickets/TicketListTable';
import { TicketWorkDialog } from '@/components/tickets/TicketWorkDialog';
import { TICKET_PRIORITY_OPTIONS, TICKET_TEAM_OPTIONS } from '@/components/tickets/ticket-badges';
import { useAuth } from '@/contexts/AuthContext';
import { useTicketHandlerStatus } from '@/hooks/useTicketHandlers';
import { useCreateTicket, useTickets, useUpdateTicket, type TicketRecord } from '@/hooks/useTickets';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, CheckCircle2, ClipboardList, LifeBuoy, Loader2, Plus } from 'lucide-react';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';

export default function TicketsPage(): ReactNode {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'submitted' | 'assigned'>('submitted');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAssignedTicket, setSelectedAssignedTicket] = useState<TicketRecord | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [team, setTeam] = useState<'hr' | 'it'>('it');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  const { data: submittedData, isLoading: submittedLoading, error: submittedError } = useTickets({
    scope: 'submitter',
    page: 1,
    pageSize: 100,
  });
  const { data: handlerStatusData } = useTicketHandlerStatus(user?.role === 'employee');
  const isItHandler = handlerStatusData?.data.isItHandler ?? false;
  const { data: assignedData, isLoading: assignedLoading, error: assignedError } = useTickets(
    {
      scope: 'assigned',
      page: 1,
      pageSize: 100,
    },
    { enabled: isItHandler }
  );
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();

  const submittedTickets = submittedData?.data ?? [];
  const assignedTickets = assignedData?.data ?? [];

  const stats = useMemo(
    () => ({
      submitted: submittedTickets.length,
      open: submittedTickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length,
      assigned: assignedTickets.length,
      resolved: submittedTickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
    }),
    [assignedTickets.length, submittedTickets]
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await createTicket.mutateAsync({ title, description, team, priority });
      addToast({ title: 'Ticket submitted', variant: 'success' });
      setTitle('');
      setDescription('');
      setTeam('it');
      setPriority('medium');
      setCreateOpen(false);
    } catch (error) {
      addToast({
        title: 'Failed to submit ticket',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 p-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tickets</h1>
          <p className="text-sm text-muted-foreground">Submit HR or IT issues and track progress in one place.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Submit Ticket
        </Button>
      </div>

      <StatCardGrid columns={4}>
        <StatCard label="Submitted" value={stats.submitted} icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="Open" value={stats.open} icon={<Loader2 className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="Assigned to Me" value={stats.assigned} icon={<LifeBuoy className="h-4 w-4" strokeWidth={1.5} />} />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />} />
      </StatCardGrid>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'submitted' | 'assigned')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="submitted">My Submitted Tickets</TabsTrigger>
          {isItHandler ? <TabsTrigger value="assigned">Assigned to Me</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="submitted">
          {submittedLoading ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<Loader2 className="h-5 w-5 animate-spin" />}
                  title="Loading tickets"
                  description="Your submitted tickets are still loading."
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : submittedError ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={AlertCircle}
                  title="Failed to load tickets"
                  description={submittedError.message}
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : (
            <TicketListTable
              tickets={submittedTickets}
              emptyTitle="No submitted tickets yet"
              emptyDescription="Use the submit button when you need HR or IT support."
              showAssignedTo
            />
          )}
        </TabsContent>
        {isItHandler ? (
          <TabsContent value="assigned">
            {assignedLoading ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={<Loader2 className="h-5 w-5 animate-spin" />}
                    title="Loading assigned tickets"
                    description="Assigned IT tickets are still loading."
                    size="sm"
                  />
                </CardContent>
              </Card>
            ) : assignedError ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={AlertCircle}
                    title="Failed to load assigned tickets"
                    description={assignedError.message}
                    size="sm"
                  />
                </CardContent>
              </Card>
            ) : (
              <TicketListTable
                tickets={assignedTickets}
                emptyTitle="No IT tickets assigned"
                emptyDescription="Assigned IT tickets will appear here once super-admin dispatches them to you."
                showSubmittedBy
                actionLabel="Update"
                onAction={setSelectedAssignedTicket}
              />
            )}
          </TabsContent>
        ) : null}
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Ticket</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Brief summary of the issue" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Team</Label>
                <Select value={team} onValueChange={(value) => setTeam(value as 'hr' | 'it')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_TEAM_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high' | 'urgent')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the issue, impact, and anything already attempted."
                rows={5}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TicketWorkDialog
        open={Boolean(selectedAssignedTicket)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAssignedTicket(null);
          }
        }}
        ticket={selectedAssignedTicket}
        isPending={updateTicket.isPending}
        onSubmit={async (payload) => {
          if (!selectedAssignedTicket) {
            return;
          }

          await updateTicket.mutateAsync({ id: selectedAssignedTicket.id, payload });
        }}
      />
    </div>
  );
}