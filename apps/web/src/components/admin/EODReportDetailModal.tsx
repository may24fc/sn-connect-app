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
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  ListChecks,
  MessageSquare,
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
            <ListChecks className="h-5 w-5 text-indigo-600" />
            End of Day Report
          </DialogTitle>
          <DialogDescription>Submitted on {formatDate(log.log_date)}</DialogDescription>
        </DialogHeader>

        {/* Intern Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
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

        {/* Tasks Completed */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <Label className="text-sm font-medium">Tasks Completed</Label>
          </div>
          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.tasks_completed}</p>
          </div>
        </div>

        {/* Learnings */}
        {log.learnings && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <Label className="text-sm font-medium">Learnings</Label>
            </div>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.learnings}</p>
            </div>
          </div>
        )}

        {/* Challenges */}
        {log.challenges && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-amber-600" />
              <Label className="text-sm font-medium">Challenges</Label>
            </div>
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.challenges}</p>
            </div>
          </div>
        )}

        {/* Existing Supervisor Notes */}
        {log.is_approved && log.supervisor_notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                <Label className="text-sm font-medium">Supervisor Notes</Label>
              </div>
              <div className="rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-3">
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
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700 text-white"
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
