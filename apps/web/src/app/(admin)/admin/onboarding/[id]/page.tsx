'use client';

import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <div className="text-zinc-500 dark:text-zinc-400 mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

export default function OnboardingDetailPage(): ReactNode {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error } = useOnboardingProfile(id);
  const profile = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" strokeWidth={1.5} />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Onboarding profile not found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = profile.full_name || [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ') || 'Unnamed';
  const role = Array.isArray(profile.users)
    ? profile.users[0]?.role
    : profile.users?.role;
  const department = Array.isArray(profile.departments)
    ? profile.departments[0]?.name
    : profile.departments?.name;
  const statusLabel = profile.status === 'completed' || profile.is_completed ? 'Completed' : 'In Progress';

  const currentStepMap: Record<string, string> = {
    personal_info: 'Personal Information',
    payment_info: 'Payment Information',
    documents: 'Documents',
    review: 'Review',
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-lg bg-slate-100 dark:bg-zinc-900/30 text-slate-700 dark:text-zinc-400">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {fullName}
            </h1>
            <Badge variant={statusLabel === 'Completed' ? 'success' : 'warning'}>
              {statusLabel}
            </Badge>
            {role && (
              <Badge variant="outline" className="capitalize">
                {role}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400 flex-wrap">
            {profile.email_address && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {profile.email_address}
              </span>
            )}
            {profile.position && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {profile.position}
              </span>
            )}
            {department && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {department}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Current Step: {currentStepMap[profile.current_step] || profile.current_step} · Submitted {formatDate(profile.created_at)}
          </p>
        </div>
      </div>

      {/* Tabbed Details */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">
            <User className="mr-1.5 h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Phone className="mr-1.5 h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard className="mr-1.5 h-4 w-4" />
            Payment
          </TabsTrigger>
        </TabsList>

        {/* Personal Tab */}
        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Basic personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800">
              <InfoField
                icon={<User className="h-4 w-4" />}
                label="Full Name"
                value={[profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ') || '—'}
              />
              <InfoField
                icon={<Calendar className="h-4 w-4" />}
                label="Birthday"
                value={formatDate(profile.birthday)}
              />
              <InfoField
                icon={<Mail className="h-4 w-4" />}
                label="Personal Email"
                value={profile.personal_email || profile.email_address || '—'}
              />
              <InfoField
                icon={<Mail className="h-4 w-4" />}
                label="Company Email"
                value={profile.company_email || '—'}
              />
              <InfoField
                label="Nationality"
                value={profile.nationality || '—'}
              />
              <InfoField
                label="Education"
                value={profile.education || '—'}
              />
              <InfoField
                label="Major"
                value={profile.major || '—'}
              />
              <InfoField
                icon={<Calendar className="h-4 w-4" />}
                label="Start Date"
                value={formatDate(profile.start_date)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
              <CardDescription>Phone, address, and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800">
              <InfoField
                icon={<Phone className="h-4 w-4" />}
                label="Contact Number"
                value={profile.contact_number || '—'}
              />
              <InfoField
                icon={<MapPin className="h-4 w-4" />}
                label="Address"
                value={profile.address || '—'}
              />
              <InfoField
                icon={<Mail className="h-4 w-4" />}
                label="LinkedIn"
                value={profile.linkedin_profile_url || '—'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emergency Contact</CardTitle>
              <CardDescription>Emergency contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800">
              <InfoField
                label="Name"
                value={profile.emergency_contact_name || '—'}
              />
              <InfoField
                label="Relationship"
                value={profile.emergency_contact_relationship || '—'}
              />
              <InfoField
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={profile.emergency_contact_number || '—'}
              />
              <InfoField
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={profile.emergency_contact_email || '—'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Information</CardTitle>
              <CardDescription>Bank and payment account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800">
              <InfoField
                label="Account Name"
                value={profile.payment_account_name || '—'}
              />
              <InfoField
                label="Account Number"
                value={profile.payment_account_masked || profile.payment_account_number || '—'}
              />
              <InfoField
                icon={<Mail className="h-4 w-4" />}
                label="Payment Email"
                value={profile.payment_email || '—'}
              />
              <InfoField
                icon={<Phone className="h-4 w-4" />}
                label="Payment Phone"
                value={profile.payment_phone_number || '—'}
              />
              <InfoField
                icon={<MapPin className="h-4 w-4" />}
                label="Address"
                value={
                  [profile.payment_address, profile.payment_city, profile.payment_province, profile.payment_zipcode]
                    .filter(Boolean)
                    .join(', ') || '—'
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
