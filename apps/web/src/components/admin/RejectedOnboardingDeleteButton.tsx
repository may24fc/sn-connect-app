'use client';

import { useDeleteRejectedOnboardingSubmission } from '@/hooks/useUserManagement';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@hr-portal/ui';
import { Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface RejectedOnboardingDeleteButtonProps {
  profileId: string;
  fullName: string;
  subjectLabel: 'employee' | 'associate';
}

export function RejectedOnboardingDeleteButton({
  profileId,
  fullName,
  subjectLabel,
}: RejectedOnboardingDeleteButtonProps): ReactNode {
  const [open, setOpen] = useState(false);
  const deleteRejectedSubmission = useDeleteRejectedOnboardingSubmission();
  const { addToast } = useToast();

  const handleDelete = async (): Promise<void> => {
    try {
      await deleteRejectedSubmission.mutateAsync({ profileId });
      addToast({
        title: 'Rejected submission deleted',
        description: `${fullName} has been moved back to onboarding setup.`,
        variant: 'success',
      });
      setOpen(false);
    } catch (error) {
      addToast({
        title: 'Failed to delete rejected submission',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="mr-1 h-4 w-4" />
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Delete rejected submission</DialogTitle>
            <DialogDescription>
              This removes the rejected onboarding submission for {fullName}, deletes the current
              onboarding record and uploaded documents, and sends the {subjectLabel} back to
              onboarding setup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleteRejectedSubmission.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleDelete();
              }}
              disabled={deleteRejectedSubmission.isPending}
            >
              {deleteRejectedSubmission.isPending ? 'Deleting...' : 'Delete submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}