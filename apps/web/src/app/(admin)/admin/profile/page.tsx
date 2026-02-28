'use client';

import {
  BentoGrid,
  BentoCard,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardContent,
} from '@/components/data-display';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import {
  useRoleMetadata,
  useUpdateRoleMetadata,
  useDeleteRoleMetadata,
  ROLE_TYPE_REGISTRY,
} from '@/hooks/useRoleMetadata';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  RoleMetadataFormContainer,
  Skeleton,
} from '@hr-portal/ui';
import {
  Building2,
  Calendar,
  Camera,
  Edit2,
  ExternalLink,
  Flag,
  GraduationCap,
  Heart,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

// --- Profile Info Item ---

interface ProfileInfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  href?: string;
  isExternal?: boolean;
}

function ProfileInfoItem({ icon, label, value, href, isExternal }: ProfileInfoItemProps): React.ReactNode {
  const displayValue = value || '—';
  const content = href && value ? (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
    >
      {displayValue}
      {isExternal && <ExternalLink className="h-3 w-3" />}
    </a>
  ) : (
    <p className="text-sm text-zinc-900 dark:text-zinc-100">{displayValue}</p>
  );

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-zinc-400 dark:text-zinc-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{label}</p>
        {content}
      </div>
    </div>
  );
}

function ProfileInfoSkeleton({ rows = 3 }: { rows?: number }): React.ReactNode {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`skeleton-${i.toString()}`} className="flex items-start gap-3">
          <Skeleton className="h-4 w-4 mt-0.5 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Helpers ---

function formatBirthday(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function calculateAge(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age.toString();
  } catch {
    return null;
  }
}

export default function AdminProfilePage() {
  const { user } = useAuth();
  const { data: employeesData, isLoading } = useEmployees({
    search: user?.email || '',
    pageSize: 1,
  });
  const employee = employeesData?.data?.[0] ?? null;

  // Fetch onboarding profile for enriched personal data
  const { data: profileData, isLoading: isProfileLoading } = useOnboardingProfile();
  const profile = profileData?.data ?? null;

  const [isEditing, setIsEditing] = useState(false);

  // Role metadata hooks (must be called before any early returns)
  const { data: metadataRecords = [], isLoading: isMetadataLoading } = useRoleMetadata(user?.id);
  const updateMetadata = useUpdateRoleMetadata(user?.id);
  const deleteMetadata = useDeleteRoleMetadata(user?.id);

  const handleSaveMetadata = useCallback(
    async (roleType: string, metadata: Record<string, unknown>) => {
      await updateMetadata.mutateAsync({ role_type: roleType, metadata });
    },
    [updateMetadata]
  );

  const handleDeleteMetadata = useCallback(
    async (roleType: string) => {
      await deleteMetadata.mutateAsync(roleType);
    },
    [deleteMetadata]
  );

  // Merge data: prefer onboarding profile for enriched fields, fallback to employee
  const mergedData = useMemo(() => {
    const birthday = profile?.birthday ?? employee?.birthday ?? null;
    return {
      nationality: profile?.nationality ?? null,
      contactNumber: profile?.contact_number ?? employee?.phone ?? null,
      emailAddress: profile?.email_address ?? employee?.company_email ?? user?.email ?? null,
      education: profile?.education
        ? profile.major
          ? `${profile.education} — ${profile.major}`
          : profile.education
        : null,
      birthday: formatBirthday(birthday),
      age: profile?.age?.toString() ?? calculateAge(birthday),
      address: profile?.address ?? employee?.address ?? null,
      emergencyContactName: profile?.emergency_contact_name ?? employee?.emergency_contact_name ?? null,
      emergencyContactNumber: profile?.emergency_contact_number ?? employee?.emergency_contact_number ?? null,
      companyEmail: profile?.company_email ?? employee?.company_email ?? null,
      emergencyContactRelationship: profile?.emergency_contact_relationship ?? null,
      linkedinUrl: profile?.linkedin_profile_url ?? null,
    };
  }, [profile, employee, user?.email]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-24 w-24 rounded-full bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle missing employee data gracefully - show UI structure
  const displayName = employee
    ? `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim()
    : (user?.name ?? 'User');
  const initials = employee
    ? (employee.first_name?.[0] ?? '') + (employee.last_name?.[0] ?? '')
    : (user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('') ?? 'U');
  const position = employee?.position ?? 'Position not set';
  const department = employee?.department ?? 'Department not assigned';
  const employeeNumber = employee?.employee_number ?? 'N/A';

  const formattedMetadata = metadataRecords.map((r) => ({
    role_type: r.role_type,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
  }));

  const emergencyContact = mergedData.emergencyContactRelationship
    ? `${mergedData.emergencyContactNumber ?? '—'} (${mergedData.emergencyContactRelationship})`
    : mergedData.emergencyContactNumber;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative" data-tour="profile-avatar">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                aria-label="Change profile picture"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              <p className="text-sm text-muted-foreground">{position}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge variant="secondary">{department}</Badge>
                <Badge variant="outline">{employeeNumber}</Badge>
              </div>
              {!employee && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Complete profile information will be available once your employee record is
                  created
                </p>
              )}
            </div>

            <Button
              variant={isEditing ? 'outline' : 'default'}
              onClick={() => setIsEditing(!isEditing)}
              data-tour="profile-edit"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Bento Grid */}
      <div data-tour="profile-info">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
          Personal Information
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Your profile details and contact information
        </p>

        <BentoGrid columns={3}>
          {/* Basic Info */}
          <BentoCard>
            <BentoCardHeader>
              <BentoCardTitle icon={<User className="h-4 w-4" />}>Basic Info</BentoCardTitle>
            </BentoCardHeader>
            <BentoCardContent>
              {isProfileLoading ? (
                <ProfileInfoSkeleton rows={3} />
              ) : (
                <div className="space-y-4">
                  <ProfileInfoItem
                    icon={<Flag className="h-4 w-4" />}
                    label="Nationality"
                    value={mergedData.nationality}
                  />
                  <ProfileInfoItem
                    icon={<Calendar className="h-4 w-4" />}
                    label="Birthday"
                    value={mergedData.birthday}
                  />
                  <ProfileInfoItem
                    icon={<User className="h-4 w-4" />}
                    label="Age"
                    value={mergedData.age}
                  />
                </div>
              )}
            </BentoCardContent>
          </BentoCard>

          {/* Contact Info */}
          <BentoCard>
            <BentoCardHeader>
              <BentoCardTitle icon={<Phone className="h-4 w-4" />}>Contact</BentoCardTitle>
            </BentoCardHeader>
            <BentoCardContent>
              {isProfileLoading ? (
                <ProfileInfoSkeleton rows={4} />
              ) : (
                <div className="space-y-4">
                  <ProfileInfoItem
                    icon={<Phone className="h-4 w-4" />}
                    label="Contact Number"
                    value={mergedData.contactNumber}
                  />
                  <ProfileInfoItem
                    icon={<Mail className="h-4 w-4" />}
                    label="Email Address"
                    value={mergedData.emailAddress}
                    href={mergedData.emailAddress ? `mailto:${mergedData.emailAddress}` : undefined}
                  />
                  <ProfileInfoItem
                    icon={<Building2 className="h-4 w-4" />}
                    label="Company Email"
                    value={mergedData.companyEmail}
                    href={mergedData.companyEmail ? `mailto:${mergedData.companyEmail}` : undefined}
                  />
                  <ProfileInfoItem
                    icon={<Linkedin className="h-4 w-4" />}
                    label="LinkedIn Profile"
                    value={mergedData.linkedinUrl ? 'View Profile' : null}
                    href={mergedData.linkedinUrl ?? undefined}
                    isExternal
                  />
                </div>
              )}
            </BentoCardContent>
          </BentoCard>

          {/* Education */}
          <BentoCard>
            <BentoCardHeader>
              <BentoCardTitle icon={<GraduationCap className="h-4 w-4" />}>Education</BentoCardTitle>
            </BentoCardHeader>
            <BentoCardContent>
              {isProfileLoading ? (
                <ProfileInfoSkeleton rows={1} />
              ) : (
                <ProfileInfoItem
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Education"
                  value={mergedData.education}
                />
              )}
            </BentoCardContent>
          </BentoCard>

          {/* Address */}
          <BentoCard colSpan={2}>
            <BentoCardHeader>
              <BentoCardTitle icon={<MapPin className="h-4 w-4" />}>Address</BentoCardTitle>
            </BentoCardHeader>
            <BentoCardContent>
              {isProfileLoading ? (
                <ProfileInfoSkeleton rows={1} />
              ) : (
                <ProfileInfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Address"
                  value={mergedData.address}
                />
              )}
            </BentoCardContent>
          </BentoCard>

          {/* Emergency Contact */}
          <BentoCard>
            <BentoCardHeader>
              <BentoCardTitle icon={<Heart className="h-4 w-4" />}>Emergency Contact</BentoCardTitle>
            </BentoCardHeader>
            <BentoCardContent>
              {isProfileLoading ? (
                <ProfileInfoSkeleton rows={2} />
              ) : (
                <div className="space-y-4">
                  <ProfileInfoItem
                    icon={<User className="h-4 w-4" />}
                    label="Contact Name"
                    value={mergedData.emergencyContactName}
                  />
                  <ProfileInfoItem
                    icon={<Phone className="h-4 w-4" />}
                    label="Number & Relationship"
                    value={emergencyContact}
                  />
                </div>
              )}
            </BentoCardContent>
          </BentoCard>
        </BentoGrid>
      </div>

      {/* Role Details Section (V2-4.1) */}
      {!isMetadataLoading && (
        <div data-tour="profile-roles">
        <RoleMetadataFormContainer
          metadataRecords={formattedMetadata}
          roleTypeRegistry={ROLE_TYPE_REGISTRY}
          onSave={handleSaveMetadata}
          onDelete={handleDeleteMetadata}
          isSaving={updateMetadata.isPending}
          isDeleting={deleteMetadata.isPending}
        />
        </div>
      )}
    </div>
  );
}
