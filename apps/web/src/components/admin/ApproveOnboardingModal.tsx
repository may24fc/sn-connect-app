'use client';

import { useApproveOnboarding } from '@/hooks/useUserManagement';
import {
  getOnboardingReviewStateBadgeVariant,
  getOnboardingReviewStateLabel,
  type OnboardingReviewState,
} from '@/lib/onboarding-review-state';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@hr-portal/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@hr-portal/ui/primitives/dialog';
import { Label } from '@hr-portal/ui/primitives/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hr-portal/ui/primitives/tabs';
import { Textarea } from '@hr-portal/ui/primitives/textarea';
import { Badge, useToast } from '@hr-portal/ui';
import {
  Briefcase,
  Calendar,
  CheckCircle,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const approvalSchema = z.object({
  notes: z.string().optional(),
});

type ApprovalFormData = z.infer<typeof approvalSchema>;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function normalizeAddress(address?: string): string {
  if (!address) {
    return '';
  }

  const segments = address
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const separatorIndex = segment.indexOf(':');
      if (separatorIndex === -1) {
        return segment;
      }
      return segment.slice(separatorIndex + 1).trim();
    })
    .filter(Boolean);

  return segments.join(', ');
}

interface OnboardingData {
  id: string;
  user_id: string;
  full_name: string;
  email_address: string;
  role: 'employee' | 'intern';
  position: string | null;
  department_id: string | null;
  completed_at: string;
  // Personal Information
  first_name: string;
  middle_name?: string;
  last_name: string;
  birthday?: string;
  contact_number?: string;
  // Address
  address?: string;
  payment_city?: string;
  payment_province?: string;
  payment_zipcode?: string;
  // Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_number?: string;
  // Government IDs
  sss_number?: string;
  tin_number?: string;
  philhealth_number?: string;
  pagibig_number?: string;
  // Bank Details
  payment_account_number?: string;
  payment_account_name?: string;
  payment_bank_name?: string;
  review_state?: OnboardingReviewState;
  rejection_notes?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_count?: number;
  invite_probation_mode?: 'under_probation' | 'no_probation';
  invite_probation_auto_90?: boolean;
  invite_probation_end_date?: string | null;
}

interface ApproverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onboarding: OnboardingData | null;
  onApprovalSuccess?: (data: {
    userId: string;
    fullName: string;
    email: string;
    role: 'employee' | 'intern';
    position: string | null;
    inviteProbationMode?: 'under_probation' | 'no_probation';
    inviteProbationAuto90?: boolean;
    inviteProbationEndDate?: string | null;
  }) => void;
}

export function ApproveOnboardingModal({
  open,
  onOpenChange,
  onboarding,
  onApprovalSuccess,
}: ApproverModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const approveOnboarding = useApproveOnboarding();
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
  });

  const submitAction = async (data: ApprovalFormData, selectedAction: 'approve' | 'reject') => {
    if (!onboarding) return;

    try {
      await approveOnboarding.mutateAsync({
        userId: onboarding.user_id,
        approved: selectedAction === 'approve',
        notes: data.notes || '',
      });

      addToast({
        title: selectedAction === 'approve' ? 'Onboarding approved' : 'Onboarding rejected',
        description:
          selectedAction === 'approve'
            ? `${onboarding.full_name} can now proceed to assignment.`
            : `${onboarding.full_name} was notified of the rejection.`,
        variant: selectedAction === 'approve' ? 'success' : 'default',
      });

      if (selectedAction === 'approve' && onApprovalSuccess) {
        onApprovalSuccess({
          userId: onboarding.user_id,
          fullName: onboarding.full_name,
          email: onboarding.email_address,
          role: onboarding.role,
          position: onboarding.position,
          ...(onboarding.invite_probation_mode
            ? { inviteProbationMode: onboarding.invite_probation_mode }
            : {}),
          ...(typeof onboarding.invite_probation_auto_90 === 'boolean'
            ? { inviteProbationAuto90: onboarding.invite_probation_auto_90 }
            : {}),
          ...(onboarding.invite_probation_end_date
            ? { inviteProbationEndDate: onboarding.invite_probation_end_date }
            : {}),
        });
      }

      handleClose();
    } catch (error) {
      console.error('Failed to process onboarding:', error);
      addToast({
        title: 'Failed to process onboarding decision',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  const handleClose = () => {
    reset();
    setAction(null);
    onOpenChange(false);
  };

  if (!onboarding) return null;

  const normalizedAddress = normalizeAddress(onboarding.address);
  const fallbackAddress = [
    onboarding.address,
    onboarding.payment_city,
    onboarding.payment_province,
    onboarding.payment_zipcode,
  ]
    .filter(Boolean)
    .join(', ');
  const displayAddress = normalizedAddress || fallbackAddress || 'Not provided';
  const hasRejectionHistory = (onboarding.rejection_count ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            Review Onboarding Submission
          </DialogTitle>
          <DialogDescription>
            Review the submitted information and approve or reject this {onboarding.role}{' '}
            onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Card */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{onboarding.full_name}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {onboarding.email_address}
                </p>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                    {onboarding.position || 'No position specified'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                    Submitted on {formatDateTime(onboarding.completed_at)}
                  </span>
                  {onboarding.review_state && onboarding.review_state !== 'in_progress' && (
                    <Badge variant={getOnboardingReviewStateBadgeVariant(onboarding.review_state)}>
                      {getOnboardingReviewStateLabel(onboarding.review_state)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    onboarding.role === 'intern'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  }`}
                >
                  {onboarding.role === 'intern' ? 'Intern' : 'Employee'}
                </span>
                {hasRejectionHistory && onboarding.review_state === 'awaiting_review' && (
                  <Badge variant="secondary">Resubmission</Badge>
                )}
              </div>
            </div>
          </div>

          {hasRejectionHistory && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-400" />
                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-rose-900 dark:text-rose-100">
                      {onboarding.review_state === 'awaiting_review'
                        ? 'Previous rejection on this submission'
                        : 'Latest rejection details'}
                    </p>
                    <p className="text-sm text-rose-700 dark:text-rose-300">
                      Rejected {onboarding.rejection_count} time{onboarding.rejection_count === 1 ? '' : 's'}
                      {onboarding.rejected_at
                        ? ` · Last rejected ${formatDateTime(onboarding.rejected_at)}`
                        : ''}
                    </p>
                  </div>
                  <p className="text-sm text-rose-800 dark:text-rose-200">
                    {onboarding.rejection_notes || 'No rejection notes were captured.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <InfoField
                icon={<User className="h-4 w-4" />}
                label="Full Name"
                value={[onboarding.first_name, onboarding.middle_name, onboarding.last_name]
                  .filter(Boolean)
                  .join(' ')}
              />
              <InfoField
                icon={<Calendar className="h-4 w-4" />}
                label="Birth Date"
                value={onboarding.birthday ? formatDate(onboarding.birthday) : 'Not provided'}
              />
              <InfoField
                icon={<Mail className="h-4 w-4" />}
                label="Personal Email"
                value={onboarding.email_address || 'Not provided'}
              />
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              <InfoField
                icon={<Phone className="h-4 w-4" />}
                label="Contact Number"
                value={onboarding.contact_number || 'Not provided'}
              />
              <InfoField
                icon={<MapPin className="h-4 w-4" />}
                label="Address"
                value={displayAddress}
              />
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <h4 className="font-medium text-sm mb-3">Emergency Contact</h4>
                <div className="space-y-3">
                  <InfoField
                    label="Name"
                    value={onboarding.emergency_contact_name || 'Not provided'}
                  />
                  <InfoField
                    label="Relationship"
                    value={onboarding.emergency_contact_relationship || 'Not provided'}
                  />
                  <InfoField
                    label="Phone"
                    value={onboarding.emergency_contact_number || 'Not provided'}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4 mt-4">
              <InfoField label="Bank Name" value={onboarding.payment_bank_name || 'Not provided'} />
              <InfoField
                label="Account Number"
                value={onboarding.payment_account_number || 'Not provided'}
              />
              <InfoField
                label="Account Name"
                value={onboarding.payment_account_name || 'Not provided'}
              />
            </TabsContent>
          </Tabs>

          {/* Action Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                Review Notes {action === 'reject' && '(recommended for rejection)'}
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this approval/rejection..."
                rows={3}
                {...register('notes')}
                disabled={approveOnboarding.isPending}
              />
              {errors.notes && <p className="text-sm text-red-600">{errors.notes.message}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAction('reject');
                  handleSubmit((data) => submitAction(data, 'reject'))();
                }}
                disabled={approveOnboarding.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                {approveOnboarding.isPending && action === 'reject' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setAction('approve');
                  handleSubmit((data) => submitAction(data, 'approve'))();
                }}
                disabled={approveOnboarding.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {approveOnboarding.isPending && action === 'approve' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
            </div>

            {approveOnboarding.isError && (
              <p className="text-sm text-red-600 text-center">
                Failed to process onboarding. Please try again.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="text-zinc-500 dark:text-zinc-400 mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
