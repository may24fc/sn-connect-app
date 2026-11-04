'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useMyProjectInvitations, useRespondProjectInvitation } from '@/hooks/useProjects';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageTitle,
  Skeleton,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, ArrowLeft, Inbox, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ProjectInvitationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, isError, refetch } = useMyProjectInvitations(user?.id);
  const respond = useRespondProjectInvitation();
  const { addToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [acceptedProject, setAcceptedProject] = useState<{ id: string; name: string } | null>(null);

  async function handleResponse(
    invitationId: string,
    projectName: string,
    action: 'accept' | 'decline'
  ) {
    setBusyId(invitationId);
    try {
      const result = await respond.mutateAsync({ invitationId, action });
      if (action === 'accept') {
        setAcceptedProject({ id: result.projectId, name: projectName });
      }
      addToast({
        title: action === 'accept' ? 'Invitation accepted' : 'Invitation declined',
        description: action === 'accept' && result.makePrimary && !result.primaryChanged
          ? 'The primary lead changed while you were invited, so you joined as a co-lead.'
          : action === 'accept' ? 'You can now open the project.' : 'You were not added to the project.',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Could not respond to invitation',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
      void refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          <Link href="/notifications" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to notifications
          </Link>
          <div>
            <PageTitle>Project invitations</PageTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Review the requested role before deciding. Invitations do not add you to a project until you accept.
            </p>
          </div>
        </div>

        {acceptedProject ? (
          <output className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm">
            <span>You joined {acceptedProject.name}.</span>
            <Button asChild size="sm">
              <Link href={`/projects/${acceptedProject.id}`}>Open project</Link>
            </Button>
          </output>
        ) : null}

        {authLoading || isLoading ? (
          <div aria-label="Loading invitations" className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-3">
            <EmptyState icon={AlertCircle} title="Could not load invitations" description="Try again to review your invitations." size="sm" />
            <div className="text-center">
              <Button variant="outline" onClick={() => void refetch()}>Retry</Button>
            </div>
          </div>
        ) : !data?.data.length ? (
          <EmptyState icon={Inbox} title="No pending invitations" description="Project invitations will appear here when someone invites you." />
        ) : (
          <div className="space-y-4">
            {data.data.map((invitation) => (
              <Card key={invitation.id}>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="min-w-0 break-words">{invitation.project_name}</CardTitle>
                    <Badge variant="outline">
                      {invitation.make_primary ? 'Proposed primary lead' : invitation.role === 'lead' ? 'Project lead' : 'Contributor'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Invited by {invitation.inviter_name}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {invitation.project_description ? (
                    <p className="whitespace-pre-wrap break-words text-sm">{invitation.project_description}</p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {invitation.role === 'lead'
                      ? 'Project leads can manage the project and are also contributors.'
                      : 'Contributors can participate without receiving project lead management access.'}
                    {invitation.make_primary
                      ? ' You become primary lead on acceptance if the current primary has not changed; otherwise you join as a co-lead.'
                      : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={respond.isPending} onClick={() => void handleResponse(invitation.id, invitation.project_name, 'accept')}>
                      {busyId === invitation.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Accept invitation
                    </Button>
                    <Button variant="outline" disabled={respond.isPending} onClick={() => void handleResponse(invitation.id, invitation.project_name, 'decline')}>
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
