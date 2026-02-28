'use client';

import {
  type ProfileChangeRequest,
  useDirectoryDetail,
  useReviewProfileChangeRequest,
} from '@/hooks/useDirectory';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@hr-portal/ui';
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, use, useState } from 'react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function calculateAge(birthday: string | null): string {
  if (!birthday) return '—';
  const today = new Date();
  const birth = new Date(birthday);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return String(age);
}

function getStatusBadgeVariant(
  status: string | null
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'on_leave':
      return 'secondary';
    case 'terminated':
      return 'destructive';
    case 'probation':
    case 'pending_onboarding':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getChangeStatusBadge(status: string): ReactNode {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
          <AlertCircle className="h-3 w-3 mr-1" strokeWidth={1.5} />
          Pending
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
          <CheckCircle2 className="h-3 w-3 mr-1" strokeWidth={1.5} />
          Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className="text-xs text-red-600 border-red-300">
          <XCircle className="h-3 w-3 mr-1" strokeWidth={1.5} />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          {status}
        </Badge>
      );
  }
}

// Map field keys to human-readable labels
const FIELD_LABELS: Record<string, string> = {
  first_name: 'First Name',
  middle_name: 'Middle Name',
  last_name: 'Last Name',
  position: 'Position',
  department: 'Department',
  phone: 'Contact Number',
  personal_email: 'Personal Email',
  company_email: 'Company Email',
  birthday: 'Birthday',
  nationality: 'Nationality',
  education: 'Education',
  address: 'Address',
  city: 'City',
  province: 'Province',
  postal_code: 'Postal Code',
  linkedin_profile_url: 'LinkedIn Profile',
  emergency_contact_name: 'Emergency Contact Name',
  emergency_contact_number: 'Emergency Contact Number',
  emergency_contact_relationship: 'Emergency Contact Relationship',
  payment_account_name: 'Payment Account Name',
  payment_account_number: 'Payment Account Number',
  payment_email: 'Payment Email',
  payment_phone_number: 'Payment Phone Number',
  payment_address: 'Payment Address',
  payment_city: 'Payment City',
  payment_province: 'Payment Province',
  payment_zipcode: 'Payment Zipcode',
};

// ─── Detail Row Component ────────────────────────────────────────────

function DetailRow({
  label,
  value,
  icon,
  isLink,
}: {
  label: string;
  value: string | null;
  icon?: ReactNode;
  isLink?: boolean;
}): ReactNode {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {icon && <div className="mt-0.5 text-zinc-400 dark:text-zinc-500 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        {isLink && value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            {value}
            <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
          </a>
        ) : (
          <p className="text-sm text-zinc-900 dark:text-zinc-100">{value || '—'}</p>
        )}
      </div>
    </div>
  );
}

// ─── Change Request Review Dialog ────────────────────────────────────

function ReviewDialog({
  request,
  open,
  onClose,
}: {
  request: ProfileChangeRequest | null;
  open: boolean;
  onClose: () => void;
}): ReactNode {
  const [reviewNote, setReviewNote] = useState('');
  const reviewMutation = useReviewProfileChangeRequest();

  const handleAction = (action: 'approve' | 'reject') => {
    if (!request) return;
    reviewMutation.mutate(
      { id: request.id, action, review_note: reviewNote || undefined },
      {
        onSuccess: () => {
          setReviewNote('');
          onClose();
        },
      }
    );
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Review Change Request</DialogTitle>
          <DialogDescription className="text-sm">
            Requested {formatDate(request.requested_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Proposed Changes
          </p>
          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
            {Object.entries(request.changes).map(([field, change]) => (
              <div key={field} className="px-3 py-2.5">
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                  {FIELD_LABELS[field] || field}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[11px] text-zinc-400">Current</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">{change.old || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-indigo-500">Proposed</p>
                    <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                      {change.new || '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
              Review Note (optional)
            </p>
            <Textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add a note about this decision..."
              className="resize-none text-sm"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('reject')}
            disabled={reviewMutation.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => handleAction('approve')}
            disabled={reviewMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function DirectoryDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}): ReactNode {
  const { userId } = use(params);
  const { data, isLoading, isError } = useDirectoryDetail(userId);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProfileChangeRequest | null>(null);

  const entry = data?.data;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !entry) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <AlertCircle
          className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3"
          strokeWidth={1.5}
        />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Employee not found or could not be loaded.
        </p>
        <Link href="/admin/directory">
          <Button variant="outline" size="sm" className="mt-4">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
            Back to Directory
          </Button>
        </Link>
      </div>
    );
  }

  const pendingRequests =
    entry.pending_change_requests?.filter((r) => r.status === 'pending') ?? [];
  const allRequests = entry.pending_change_requests ?? [];

  const fullAddress = [entry.address, entry.city, entry.province, entry.postal_code]
    .filter(Boolean)
    .join(', ');

  const paymentAddress = [
    entry.payment_address,
    entry.payment_city,
    entry.payment_province,
    entry.payment_zipcode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/directory">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarImage src={entry.avatar_url || undefined} />
            <AvatarFallback className="text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              {getInitials(entry.full_name || 'U')}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {entry.full_name || 'Unknown'}
              </h1>
              <Badge variant={getStatusBadgeVariant(entry.status)} className="text-xs capitalize">
                {entry.status?.replace('_', ' ') || '—'}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {entry.role?.replace('_', ' ') || '—'}
              </Badge>
              {pendingRequests.length > 0 && (
                <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300">
                  <AlertCircle className="h-3 w-3 mr-1" strokeWidth={1.5} />
                  {pendingRequests.length} pending change{pendingRequests.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {entry.position || '—'} · {entry.department_name || '—'}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile" className="text-sm">
            Profile
          </TabsTrigger>
          <TabsTrigger value="changes" className="text-sm">
            Change Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-medium h-4 w-4">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Profile Tab ───────────────────────────────────────── */}
        <TabsContent value="profile" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <DetailRow
                    label="Full Name"
                    value={
                      [entry.first_name, entry.middle_name, entry.last_name]
                        .filter(Boolean)
                        .join(' ') || entry.full_name
                    }
                  />
                  <DetailRow
                    label="Email Address"
                    value={entry.email}
                    icon={<Mail className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                  <DetailRow
                    label="Contact Number"
                    value={entry.contact_number}
                    icon={<Phone className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                  <DetailRow
                    label="Birthday"
                    value={formatDate(entry.birthday)}
                    icon={<Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                  <DetailRow label="Age" value={calculateAge(entry.birthday)} />
                  <DetailRow
                    label="Nationality"
                    value={entry.nationality}
                    icon={<Globe className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                  <DetailRow
                    label="Education"
                    value={entry.education}
                    icon={<GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                  <DetailRow
                    label="Address"
                    value={fullAddress || null}
                    icon={<MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                  <DetailRow
                    label="LinkedIn Profile"
                    value={entry.linkedin_profile_url}
                    icon={<ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />}
                    isLink
                  />
                </div>
              </CardContent>
            </Card>

            {/* Employment Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  Employment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <DetailRow label="Position" value={entry.position} />
                  <DetailRow label="Department" value={entry.department_name} />
                  <DetailRow
                    label="Start Date"
                    value={formatDate(entry.start_date)}
                    icon={<Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                  <DetailRow
                    label="Employment Type"
                    value={entry.employment_type?.replace('_', ' ') || null}
                  />
                  <DetailRow label="Status" value={entry.status?.replace('_', ' ') || null} />
                  {entry.internship_id && (
                    <>
                      <Separator className="my-1" />
                      <DetailRow label="School" value={entry.school} />
                      <DetailRow label="Program" value={entry.program} />
                      <DetailRow
                        label="Hours Progress"
                        value={
                          entry.completed_hours != null && entry.required_hours != null
                            ? `${entry.completed_hours}/${entry.required_hours} hours`
                            : null
                        }
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <DetailRow
                    label="Emergency Contact Name"
                    value={entry.emergency_contact_name}
                    icon={<User className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                  <DetailRow
                    label="Emergency Contact Number & Relationship"
                    value={
                      entry.emergency_contact_number
                        ? `${entry.emergency_contact_number}${entry.emergency_contact_relationship ? ` (${entry.emergency_contact_relationship})` : ''}`
                        : null
                    }
                    icon={<Phone className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Allowance / Payment Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                  Allowance / Payment Details
                </CardTitle>
                <CardDescription className="text-xs">
                  For allowance disbursement purposes
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <DetailRow label="Account Name" value={entry.payment_account_name} />
                  <DetailRow label="Account Number" value={entry.payment_account_number} />
                  <DetailRow
                    label="Email"
                    value={entry.payment_email}
                    icon={<Mail className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                  <DetailRow
                    label="Phone Number"
                    value={entry.payment_phone_number}
                    icon={<Phone className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                  <DetailRow
                    label="Address (City, Province, Zipcode)"
                    value={paymentAddress || null}
                    icon={<MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Change Requests Tab ───────────────────────────────── */}
        <TabsContent value="changes" className="mt-4">
          {allRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2
                  className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No change requests found for this employee.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allRequests.map((req) => (
                <Card key={req.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getChangeStatusBadge(req.status)}
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDate(req.requested_at)}
                        </span>
                      </div>
                      {req.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(req as unknown as ProfileChangeRequest);
                            setReviewDialogOpen(true);
                          }}
                          className="h-7 text-xs"
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                      {Object.entries(req.changes).map(([field, change]) => (
                        <div key={field} className="px-3 py-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {FIELD_LABELS[field] || field}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-400 line-through">
                              {change.old || '—'}
                            </span>
                            <span className="text-xs">→</span>
                            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                              {change.new || '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {req.review_note && (
                      <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 italic">
                        Note: {req.review_note}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <ReviewDialog
        request={selectedRequest}
        open={reviewDialogOpen}
        onClose={() => {
          setReviewDialogOpen(false);
          setSelectedRequest(null);
        }}
      />
    </div>
  );
}
