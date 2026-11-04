'use client';

import { PersonSearchSelect } from '@/components/people/PersonSearchSelect';
import {
  useAppointDepartmentLead,
  useDepartmentLeads,
  useRemoveDepartmentLead,
} from '@/hooks/useDepartmentLeads';
import type { Department } from '@hr-portal/database';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@hr-portal/ui';
import { ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ManageDepartmentLeadsDialog({
  open,
  onOpenChange,
  departments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Array<Department>;
}) {
  const { addToast } = useToast();
  const [departmentId, setDepartmentId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const {
    data: leadsResponse,
    isLoading: leadsLoading,
    error: leadsError,
    refetch: refetchLeads,
  } = useDepartmentLeads(open);
  const appoint = useAppointDepartmentLead();
  const remove = useRemoveDepartmentLead();
  const leads = leadsResponse?.data ?? [];
  const existingLeadIds = leads
    .filter((lead) => lead.department_id === departmentId)
    .map((lead) => lead.user_id);

  async function handleAppoint() {
    if (!(departmentId && candidateId)) return;
    try {
      await appoint.mutateAsync({ departmentId, userId: candidateId });
      setCandidateId('');
      addToast({ title: 'Department lead appointed', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Could not appoint lead',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Manage department leads
          </DialogTitle>
          <DialogDescription>
            Search across all departments to appoint a lead. One person can lead multiple
            departments without changing their home department. Leads can manage work for active
            members of the departments they lead, and each department can have multiple co-leads.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2 sm:col-span-2">
            <Label>Department</Label>
            <Select
              value={departmentId}
              disabled={appoint.isPending}
              onValueChange={(value) => {
                setDepartmentId(value);
                setCandidateId('');
              }}
            >
              <SelectTrigger aria-label="Department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="department-lead-search">New lead</Label>
            <PersonSearchSelect
              key={`${open}-${departmentId}`}
              id="department-lead-search"
              value={candidateId || null}
              onChange={(value) => setCandidateId(value ?? '')}
              excludeUserIds={existingLeadIds}
              emptyLabel={departmentId ? 'Search all departments' : 'Choose a department first'}
              disabled={!departmentId || leadsLoading || !!leadsError || appoint.isPending}
            />
          </div>
          <Button
            onClick={() => void handleAppoint()}
            disabled={
              !(departmentId && candidateId) ||
              existingLeadIds.includes(candidateId) ||
              !!leadsError ||
              appoint.isPending
            }
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {appoint.isPending ? 'Adding…' : 'Add lead'}
          </Button>
        </div>

        <div className="space-y-4">
          {departments.map((department) => {
            const departmentLeads = leads.filter((lead) => lead.department_id === department.id);
            if (departmentId && department.id !== departmentId) return null;
            return (
              <section key={department.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{department.name}</h3>
                  <Badge variant="secondary">
                    {departmentLeads.length} lead{departmentLeads.length === 1 ? '' : 's'}
                  </Badge>
                </div>
                {departmentLeads.length ? (
                  departmentLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={lead.avatarUrl ?? undefined} />
                          <AvatarFallback>{initials(lead.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{lead.name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {lead.position || 'Team member'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${lead.name} as ${department.name} lead`}
                        disabled={remove.isPending}
                        onClick={() =>
                          void remove
                            .mutateAsync({ departmentId: department.id, userId: lead.user_id })
                            .then(() =>
                              addToast({ title: 'Department lead removed', variant: 'success' })
                            )
                            .catch((error) =>
                              addToast({
                                title: 'Could not remove lead',
                                description:
                                  error instanceof Error ? error.message : 'Unknown error',
                                variant: 'error',
                              })
                            )
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                ) : !(leadsLoading || leadsError) ? (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    No department leads assigned.
                  </p>
                ) : null}
              </section>
            );
          })}
          {leadsLoading ? (
            <p className="text-sm text-muted-foreground">Loading department leads…</p>
          ) : null}
          {leadsError ? (
            <div role="alert" className="space-y-2">
              <p className="text-sm text-destructive">Could not load department leads.</p>
              <Button variant="outline" onClick={() => void refetchLeads()}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
