'use client';

import { PersonSearchSelect } from '@/components/people/PersonSearchSelect';
import { useUpdateProject } from '@/hooks/useProjects';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  useToast,
} from '@hr-portal/ui';
import { Loader2 } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

interface ProjectSupervisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  supervisorId: string | null;
  leadUserId: string | null;
}

/** Admin-only: the supervisor can manage the project, so the API restricts this to admins. */
export function ProjectSupervisorDialog({
  open,
  onOpenChange,
  projectId,
  supervisorId,
  leadUserId,
}: ProjectSupervisorDialogProps): ReactNode {
  const updateProject = useUpdateProject();
  const { addToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(supervisorId);

  useEffect(() => {
    if (open) {
      setSelectedId(supervisorId);
    }
  }, [open, supervisorId]);

  const handleSave = async (): Promise<void> => {
    try {
      await updateProject.mutateAsync({ projectId, supervisorId: selectedId });
      addToast({ title: 'Project supervisor updated', variant: 'success' });
      onOpenChange(false);
    } catch (error) {
      addToast({
        title: 'Failed to update supervisor',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Project supervisor</DialogTitle>
          <DialogDescription>
            The supervisor can manage this project&apos;s contributors, milestones, and tasks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="project-supervisor-search">Supervisor</Label>
          <PersonSearchSelect
            id="project-supervisor-search"
            value={selectedId}
            onChange={setSelectedId}
            excludeUserIds={[leadUserId]}
            disabled={updateProject.isPending}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateProject.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={updateProject.isPending || selectedId === supervisorId}
          >
            {updateProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
