'use client';

import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { TicketDetailDialog } from '@/components/tickets/TicketDetailDialog';
import { TicketListTable } from '@/components/tickets/TicketListTable';
import { TicketWorkDialog } from '@/components/tickets/TicketWorkDialog';
import { TICKET_PRIORITY_OPTIONS, TICKET_TEAM_OPTIONS } from '@/components/tickets/ticket-badges';
import { useAuth } from '@/contexts/AuthContext';
import { useTicketHandlerStatus } from '@/hooks/useTicketHandlers';
import { useCreateTicket, useTickets, useUpdateTicket, type TicketRecord } from '@/hooks/useTickets';
import {
  DEFAULT_TICKET_CATEGORY_BY_TEAM,
  TICKET_CATEGORY_OPTIONS_BY_TEAM,
  TICKET_FEATURE_AREA_OPTIONS,
  type TicketCategory,
  type TicketFeatureArea,
} from '@/lib/schemas/ticket.schema';
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
  FileDropZone,
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
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ClipboardList, LifeBuoy, Loader2, Plus } from 'lucide-react';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';

const TICKET_ATTACHMENT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  '.doc',
  '.docx',
  '.txt',
].join(',');

const MAX_ATTACHMENT_FILES = 5;

function normalizeOptionalText(value: string): string | undefined {
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

export default function TicketsPage(): ReactNode {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'submitted' | 'assigned'>('submitted');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSubmittedTicket, setSelectedSubmittedTicket] = useState<TicketRecord | null>(null);
  const [selectedAssignedTicket, setSelectedAssignedTicket] = useState<TicketRecord | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [team, setTeam] = useState<'hr' | 'it'>('it');
  const [category, setCategory] = useState<TicketCategory>(DEFAULT_TICKET_CATEGORY_BY_TEAM.it);
  const [featureArea, setFeatureArea] = useState<TicketFeatureArea | undefined>();
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Array<File>>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

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

  const categoryOptions = TICKET_CATEGORY_OPTIONS_BY_TEAM[team];
  const isSubmitPending = createTicket.isPending || isUploadingAttachments;

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setTeam('it');
    setCategory(DEFAULT_TICKET_CATEGORY_BY_TEAM.it);
    setFeatureArea(undefined);
    setPriority('medium');
    setStepsToReproduce('');
    setExpectedBehavior('');
    setSelectedFiles([]);
  };

  const handleTeamChange = (value: 'hr' | 'it') => {
    setTeam(value);
    setCategory(DEFAULT_TICKET_CATEGORY_BY_TEAM[value]);
    setFeatureArea(undefined);
  };

  const uploadTicketAttachments = async (ticketId: string, files: Array<File>) => {
    if (files.length === 0) {
      return [] as Array<string>;
    }

    const failedFiles: Array<string> = [];
    setIsUploadingAttachments(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/tickets/${ticketId}/attachments`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          failedFiles.push(file.name);
        }
      }
    } finally {
      setIsUploadingAttachments(false);
    }

    return failedFiles;
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!category) {
      addToast({
        title: 'Category is required',
        description: 'Select the request type that best matches this ticket.',
        variant: 'error',
      });
      return;
    }

    if (team === 'it' && !featureArea) {
      addToast({
        title: 'Feature area is required',
        description: 'Select the affected app module so IT can triage faster.',
        variant: 'error',
      });
      return;
    }

    try {
      const response = await createTicket.mutateAsync({
        title,
        description,
        team,
        category,
        featureArea: featureArea ?? null,
        priority,
        stepsToReproduce: normalizeOptionalText(stepsToReproduce),
        expectedBehavior: normalizeOptionalText(expectedBehavior),
      });
      const failedFiles = await uploadTicketAttachments(response.data.id, selectedFiles);

      await queryClient.invalidateQueries({ queryKey: ['tickets'] });

      if (failedFiles.length > 0) {
        addToast({
          title: 'Ticket submitted with upload issues',
          description: `The ticket was created, but ${failedFiles.length} attachment${failedFiles.length === 1 ? '' : 's'} failed to upload.`,
          variant: 'warning',
        });
      } else {
        addToast({ title: 'Ticket submitted', variant: 'success' });
      }

      resetCreateForm();
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
              actionLabel="View"
              onAction={setSelectedSubmittedTicket}
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Submit Ticket</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="ticket-title">Title</Label>
              <Input
                id="ticket-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Brief summary of the issue"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Team</Label>
                <Select value={team} onValueChange={(value) => handleTeamChange(value as 'hr' | 'it')}>
                  <SelectTrigger aria-label="Team">
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
                <Label>Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as TicketCategory)}>
                  <SelectTrigger aria-label="Category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Feature Area</Label>
                <Select
                  value={featureArea ?? 'none'}
                  onValueChange={(value) =>
                    setFeatureArea(value === 'none' ? undefined : (value as TicketFeatureArea))
                  }
                >
                  <SelectTrigger aria-label="Feature area">
                    <SelectValue placeholder={team === 'it' ? 'Select affected module' : 'Optional'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{team === 'it' ? 'Select affected module' : 'Optional'}</SelectItem>
                    {TICKET_FEATURE_AREA_OPTIONS.map((option) => (
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
                  <SelectTrigger aria-label="Priority">
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
              <Label htmlFor="ticket-description">Description</Label>
              <Textarea
                id="ticket-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the issue, impact, and anything already attempted."
                rows={5}
                required
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ticket-steps">Steps to Reproduce</Label>
                <Textarea
                  id="ticket-steps"
                  value={stepsToReproduce}
                  onChange={(event) => setStepsToReproduce(event.target.value)}
                  placeholder="What did you click or do before the issue happened?"
                  rows={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ticket-expected">Expected Behavior</Label>
                <Textarea
                  id="ticket-expected"
                  value={expectedBehavior}
                  onChange={(event) => setExpectedBehavior(event.target.value)}
                  placeholder="What should have happened instead?"
                  rows={4}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Attachments</Label>
              <FileDropZone
                onFilesSelected={(files) => {
                  setSelectedFiles((currentFiles) => [...currentFiles, ...files]);
                }}
                accept={TICKET_ATTACHMENT_ACCEPT}
                multiple
                maxFiles={MAX_ATTACHMENT_FILES}
                maxSizeMB={10}
                compact
                isUploading={isUploadingAttachments}
                label="Drop screenshots or supporting files here"
                formatHint="PNG, JPG, WebP, GIF, PDF, DOC, DOCX, TXT — up to 10 MB each"
                selectedFiles={selectedFiles}
                onRemoveFile={(index) => {
                  setSelectedFiles((currentFiles) =>
                    currentFiles.filter((_, fileIndex) => fileIndex !== index)
                  );
                }}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetCreateForm();
                  setCreateOpen(false);
                }}
                disabled={isSubmitPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitPending}>
                {isSubmitPending ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TicketDetailDialog
        open={Boolean(selectedSubmittedTicket)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSubmittedTicket(null);
          }
        }}
        ticket={selectedSubmittedTicket}
        title="Submitted Ticket"
        description="Review the full details and attachments you submitted for this ticket."
      />

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