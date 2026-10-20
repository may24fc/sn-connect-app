'use client';

import { useDepartments } from '@/hooks/useDepartments';
import { queryKeys } from '@/lib/query-keys';
import {
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, X } from 'lucide-react';
import { useState } from 'react';

interface ProjectDepartment {
  id: string;
  department_id: string;
  status: 'pending' | 'active' | 'rejected' | 'removed';
  department: { name: string } | null;
  actions: { accept: boolean; reject: boolean; cancel: boolean; detach: boolean };
}

export function ManageProjectDepartmentsDialog({
  open,
  onOpenChange,
  projectId,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  canManage: boolean;
}) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [departmentId, setDepartmentId] = useState('');
  const key = [...queryKeys.projects.detail(projectId), 'departments'] as const;
  const { data, isLoading } = useQuery({
    queryKey: key,
    enabled: open,
    queryFn: async (): Promise<{ data: Array<ProjectDepartment> }> => {
      const response = await fetch(`/api/projects/${projectId}/departments`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Failed to load project departments');
      return body;
    },
  });
  const { data: departmentsResponse } = useDepartments({ page: 1, pageSize: 200 });

  const invite = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Failed to add department');
      return { body, pending: response.status === 202 };
    },
    onSuccess: ({ pending }) => {
      setDepartmentId('');
      void queryClient.invalidateQueries({ queryKey: key });
      addToast(
        pending
          ? {
              title: 'Department invitation sent',
              description: 'A lead from that department must accept it.',
              variant: 'success',
            }
          : { title: 'Department added', variant: 'success' }
      );
    },
    onError: (error) =>
      addToast({ title: 'Could not add department', description: error.message, variant: 'error' }),
  });

  const act = useMutation({
    mutationFn: async (input: {
      departmentId: string;
      action: 'accept' | 'reject' | 'cancel' | 'detach';
    }) => {
      const response = await fetch(`/api/projects/${projectId}/departments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Failed to update department');
      return input;
    },
    onSuccess: ({ action }) => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      addToast({
        title: `Department ${action === 'accept' ? 'accepted' : action === 'detach' ? 'detached' : action === 'cancel' ? 'invitation cancelled' : 'invitation rejected'}`,
        variant: 'success',
      });
    },
    onError: (error) =>
      addToast({
        title: 'Could not update department',
        description: error.message,
        variant: 'error',
      }),
  });

  const rows = data?.data ?? [];
  const used = new Set(
    rows.filter((row) => ['active', 'pending'].includes(row.status)).map((row) => row.department_id)
  );
  const available = (departmentsResponse?.data ?? []).filter(
    (department) => !used.has(department.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Project departments
          </DialogTitle>
          <DialogDescription>
            Active departments share ownership. Invitations grant no management access until a lead
            from the invited department accepts.
          </DialogDescription>
        </DialogHeader>
        {canManage ? (
          <div className="flex items-end gap-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex-1 space-y-2">
              <Label>Add a department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => invite.mutate()} disabled={!departmentId || invite.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {invite.isPending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        ) : null}
        <div className="space-y-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading departments…</p> : null}
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">{row.department?.name ?? 'Unknown department'}</p>
                <Badge
                  className="mt-1"
                  variant={
                    row.status === 'active'
                      ? 'success'
                      : row.status === 'pending'
                        ? 'warning'
                        : 'secondary'
                  }
                >
                  {row.status}
                </Badge>
              </div>
              <div className="flex gap-2">
                {row.actions?.accept ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      act.mutate({ departmentId: row.department_id, action: 'accept' })
                    }
                    disabled={act.isPending}
                  >
                    Accept
                  </Button>
                ) : null}
                {row.actions?.reject ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      act.mutate({ departmentId: row.department_id, action: 'reject' })
                    }
                    disabled={act.isPending}
                  >
                    Reject
                  </Button>
                ) : null}
                {row.actions?.cancel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      act.mutate({ departmentId: row.department_id, action: 'cancel' })
                    }
                    disabled={act.isPending}
                  >
                    Cancel
                  </Button>
                ) : null}
                {row.actions?.detach ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Detach ${row.department?.name ?? 'department'}`}
                    onClick={() =>
                      act.mutate({ departmentId: row.department_id, action: 'detach' })
                    }
                    disabled={act.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!isLoading && rows.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No departments are linked to this project.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
