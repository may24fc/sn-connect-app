'use client';

import { useUpdateInternDailyLog } from '@/hooks/useInternships';
import type { InternDailyLog } from '@/hooks/useRealtimeInternDailyLogs';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Separator,
  Textarea,
} from '@hr-portal/ui';
import {
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  ListChecks,
  MessageSquare,
  Paperclip,
  Target,
  ThumbsUp,
  TriangleAlert,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface EODReportDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: InternDailyLog | null;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function EODReportDetailModal({
  open,
  onOpenChange,
  log,
}: EODReportDetailModalProps): ReactNode {
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const updateLog = useUpdateInternDailyLog();

  if (!log) return null;

  const internName = log.internship?.employee
    ? `${log.internship.employee.first_name} ${log.internship.employee.last_name}`
    : 'Unknown Intern';

  const initials = internName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const projectEntries = log.project_entries ?? [];
  const blockers = log.blockers ?? [];
  const nextSteps = log.next_steps ?? [];
  const attachments = log.attachments ?? [];

  const handleApprove = async (): Promise<void> => {
    setIsApproving(true);
    try {
      await updateLog.mutateAsync({
        internshipId: log.internship_id,
        logId: log.id,
        isApproved: true,
        ...(supervisorNotes.trim() ? { supervisorNotes: supervisorNotes.trim() } : {}),
      });
      setSupervisorNotes('');
      onOpenChange(false);
    } catch {
      // Error is handled by the mutation hook
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base tracking-tight">
            <ListChecks className="h-5 w-5 text-slate-700" />
            End of Day Report
          </DialogTitle>
          <DialogDescription>Submitted on {formatDate(log.log_date)}</DialogDescription>
        </DialogHeader>

        {/* Intern Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs bg-zinc-100 text-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{internName}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {log.internship?.school && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {log.internship.school}
                  </span>
                )}
                {log.internship?.department && <span>{log.internship.department}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {log.is_approved ? (
              <Badge variant="success" className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                Approved
              </Badge>
            ) : (
              <Badge variant="warning" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Report Metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{formatDate(log.log_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Hours Worked:</span>
            <span className="font-medium">{log.hours_worked}h</span>
          </div>
        </div>

        <Separator />

        {/* Progress & Impact */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <Label className="text-sm font-medium">Progress &amp; Impact</Label>
          </div>
          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
            {projectEntries.length > 0 ? (
              <div className="space-y-3">
                {projectEntries.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <p className="text-sm font-medium">{entry.projectFocus}</p>
                    <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
                      <span className="font-medium">Action Taken:</span> {entry.actionTaken}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap leading-relaxed">
                      <span className="font-medium">Outcome:</span> {entry.outcome}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.tasks_completed}</p>
            )}
          </div>
        </div>

        {/* Next Steps */}
        {(nextSteps.length > 0 || log.learnings) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-slate-700" />
              <Label className="text-sm font-medium">Next Steps</Label>
            </div>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
              {nextSteps.length > 0 ? (
                <ul className="space-y-1 text-sm leading-relaxed">
                  {nextSteps.map((nextStep) => (
                    <li key={nextStep} className="list-disc whitespace-pre-wrap ml-5">
                      {nextStep}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.learnings}</p>
              )}
            </div>
          </div>
        )}

        {/* Current Blockers */}
        {(blockers.length > 0 || log.challenges) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-amber-600" />
              <Label className="text-sm font-medium">Current Blockers</Label>
            </div>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
              {blockers.length > 0 ? (
                <ul className="space-y-1 text-sm leading-relaxed">
                  {blockers.map((blocker) => (
                    <li key={blocker} className="list-disc whitespace-pre-wrap ml-5">
                      {blocker}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.challenges}</p>
              )}
            </div>
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-slate-700" />
              <Label className="text-sm font-medium">Proof Attachments</Label>
            </div>
            <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              {attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.signedUrl ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                >
                  {attachment.fileName}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Existing Supervisor Notes */}
        {log.is_approved && log.supervisor_notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-700" />
                <Label className="text-sm font-medium">Supervisor Notes</Label>
              </div>
              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/20 p-3">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {log.supervisor_notes}
                </p>
              </div>
              {log.approved_at && (
                <p className="text-xs text-muted-foreground">
                  Approved on {formatDateTime(log.approved_at)}
                </p>
              )}
            </div>
          </>
        )}

        {/* Approval Section (only for pending reports) */}
        {!log.is_approved && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="supervisor-notes" className="text-sm font-medium">
                  Supervisor Notes (Optional)
                </Label>
              </div>
              <Textarea
                id="supervisor-notes"
                placeholder="Add feedback or notes for this intern's report..."
                value={supervisorNotes}
                onChange={(e) => setSupervisorNotes(e.target.value)}
                className="min-h-[80px] text-sm resize-none"
              />
            </div>
          </>
        )}

        <DialogFooter>
          {!log.is_approved && (
            <Button
              variant="success"
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Report
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {log.is_approved ? 'Close' : 'Cancel'}
          </Button>
        </DialogFooter>

        {/* Submission timestamp */}
        <p className="text-xs text-muted-foreground text-center">
          Report submitted on {formatDateTime(log.created_at)}
        </p>
      </DialogContent>
    </Dialog>
  );
}
