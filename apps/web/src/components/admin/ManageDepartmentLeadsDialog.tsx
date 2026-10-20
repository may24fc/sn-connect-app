'use client';

import {
  useAppointDepartmentLead,
  useDepartmentLeads,
  useRemoveDepartmentLead,
} from '@/hooks/useDepartmentLeads';
import { useDirectory } from '@/hooks/useDirectory';
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
import { useMemo, useState } from 'react';

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
  const { data: leadsResponse, isLoading: leadsLoading } = useDepartmentLeads(open);
  const { data: directoryResponse, isLoading: peopleLoading } = useDirectory(
    { page: 1, pageSize: 500, excludeTerminated: true, roles: ['employee', 'associate'] },
    { enabled: open }
  );
  const appoint = useAppointDepartmentLead();
  const remove = useRemoveDepartmentLead();
  const leads = leadsResponse?.data ?? [];
  const selectedDepartment = departments.find((department) => department.id === departmentId);
  const candidates = useMemo(
    () =>
      (directoryResponse?.data ?? []).filter(
        (person) =>
          person.department_id === departmentId &&
          !leads.some(
            (lead) => lead.department_id === departmentId && lead.user_id === person.user_id
          )
      ),
    [departmentId, directoryResponse?.data, leads]
  );

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
            Department leads can create and assign project work only for active members of their own
            department. Multiple co-leads are supported.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={departmentId}
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
          <div className="space-y-2">
            <Label>New lead</Label>
            <Select
              value={candidateId}
              onValueChange={setCandidateId}
              disabled={!departmentId || peopleLoading}
            >
              <SelectTrigger aria-label="New department lead">
                <SelectValue
                  placeholder={departmentId ? 'Select a member' : 'Choose a department first'}
                />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((person) => (
                  <SelectItem key={person.user_id} value={person.user_id}>
                    {person.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void handleAppoint()} disabled={!candidateId || appoint.isPending}>
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
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    No department leads assigned.
                  </p>
                )}
              </section>
            );
          })}
          {leadsLoading ? (
            <p className="text-sm text-muted-foreground">Loading department leads…</p>
          ) : null}
          {selectedDepartment && candidates.length === 0 && !peopleLoading ? (
            <p className="text-sm text-muted-foreground">
              All eligible {selectedDepartment.name} members are already leads, or this department
              has no eligible members.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
