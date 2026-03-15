'use client';

import {
  useLeaveRequests,
  useCreateLeaveRequest,
  useUpdateLeaveRequest,
  type LeaveRequest,
} from '@/hooks/useLeaveRequests';
import { EmptyState } from '@/components/data-display';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import {
  Calendar,
  CalendarOff,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  XCircle,
} from 'lucide-react';
import { type ReactNode, useCallback, useState } from 'react';

// ──────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<string, string> = {
  vacation: 'Vacation',
  sick: 'Sick Leave',
  personal: 'Personal',
  bereavement: 'Bereavement',
  maternity: 'Maternity',
  paternity: 'Paternity',
  unpaid: 'Unpaid Leave',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  approved: { label: 'Approved', variant: 'default', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: CalendarOff },
};

const LEAVE_TYPES = ['vacation', 'sick', 'personal', 'bereavement', 'maternity', 'paternity', 'unpaid'] as const;

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function calculateDays(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.round(diffMs / 86400000) + 1);
}

// ──────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────

export default function LeavePage(): ReactNode {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const filters: import('@/lib/query-keys').LeaveRequestFilters = {
    ...(statusFilter !== 'all' ? { status: statusFilter as 'pending' | 'approved' | 'rejected' | 'cancelled' } : {}),
    page,
    pageSize: 10,
  };

  const { data, isLoading } = useLeaveRequests(filters);
  const createMutation = useCreateLeaveRequest();
  const updateMutation = useUpdateLeaveRequest();

  const leaveRequests = data?.data ?? [];
  const pagination = data?.pagination;

  const resetForm = useCallback(() => {
    setLeaveType('');
    setStartDate('');
    setEndDate('');
    setReason('');
  }, []);

  const handleSubmit = async () => {
    if (!leaveType || !startDate || !endDate || !reason.trim()) {
      addToast({ title: 'Please fill in all fields', variant: 'error' });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      addToast({ title: 'End date must be after start date', variant: 'error' });
      return;
    }

    if (reason.trim().length < 3) {
      addToast({ title: 'Reason must be at least 3 characters', variant: 'error' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        leave_type: leaveType as typeof LEAVE_TYPES[number],
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });
      addToast({ title: 'Leave request submitted', variant: 'success' });
      setDialogOpen(false);
      resetForm();
    } catch {
      addToast({ title: 'Failed to submit leave request', variant: 'error' });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await updateMutation.mutateAsync({ id, status: 'cancelled' });
      addToast({ title: 'Leave request cancelled', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to cancel request', variant: 'error' });
    }
  };

  return (
    <div className="h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Leave Requests
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Request time off and track your leave history.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New Leave Request</DialogTitle>
              <DialogDescription>
                Submit a leave request for approval. All fields are required.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger id="leave-type">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {LEAVE_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe the reason for your leave..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Request List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : leaveRequests.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No leave requests"
          description={statusFilter === 'all'
            ? 'You haven\'t submitted any leave requests yet.'
            : `No ${statusFilter} leave requests found.`}
          action={{ label: 'New Request', onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {leaveRequests.map((request: LeaveRequest) => {
            const config = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending!;
            const StatusIcon = config!.icon;
            const days = calculateDays(request.start_date, request.end_date);

            return (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {LEAVE_TYPE_LABELS[request.leave_type] ?? request.leave_type}
                        </h3>
                        <Badge variant={config!.variant}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {config!.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{formatDate(request.start_date)} – {formatDate(request.end_date)}</span>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span>{days} day{days !== 1 ? 's' : ''}</span>
                      </div>
                      {request.reason && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                          {request.reason}
                        </p>
                      )}
                      {request.reviewer_notes && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic mt-1">
                          Reviewer: {request.reviewer_notes}
                        </p>
                      )}
                    </div>
                    {request.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-500 hover:text-red-600"
                        onClick={() => handleCancel(request.id)}
                        disabled={updateMutation.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {pagination && pagination.total > pagination.pageSize && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1}–
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
