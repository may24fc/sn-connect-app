'use client';

import { AvatarPreviewModal } from '@/components/profile/AvatarPreviewModal';
import { BentoGrid } from '@/components/data-display';
import { EditableProfileSection, type EditableField } from '@/components/profile/EditableProfileSection';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import {
  useRoleMetadata,
  useUpdateRoleMetadata,
  useDeleteRoleMetadata,
  ROLE_TYPE_REGISTRY,
} from '@/hooks/useRoleMetadata';
import { useUpdateProfileInfo } from '@/hooks/useUpdateProfileInfo';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  RoleMetadataFormContainer,
  Skeleton,
  useToast,
} from '@hr-portal/ui';
import {
  Building2,
  Calendar,
  Camera,
  Flag,
  GraduationCap,
  Heart,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useUploadAvatar } from '@/hooks/useAvatar';

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

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { data: employeesData, isLoading } = useEmployees({
    search: user?.email || '',
    pageSize: 1,
  });
  const employee = employeesData?.data?.[0] ?? null;

  // Fetch onboarding profile for enriched personal data
  const { data: profileData, isLoading: isProfileLoading } = useOnboardingProfile();
  const profile = profileData?.data ?? null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatar();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const updateProfileInfo = useUpdateProfileInfo();
  const { addToast } = useToast();

  // Role metadata hooks (must be called before any early returns)
  const { data: metadataRecords = [], isLoading: isMetadataLoading } = useRoleMetadata(user?.id);
  const updateMetadata = useUpdateRoleMetadata(user?.id);
  const deleteMetadata = useDeleteRoleMetadata(user?.id);

  const handleSaveMetadata = useCallback(
    async (roleType: string, metadata: Record<string, unknown>) => {
      try {
        await updateMetadata.mutateAsync({ role_type: roleType, metadata });
        addToast({ title: 'Role details saved', variant: 'success' });
      } catch {
        addToast({ title: 'Failed to save role details', variant: 'error' });
      }
    },
    [updateMetadata, addToast]
  );

  const handleDeleteMetadata = useCallback(
    async (roleType: string) => {
      try {
        await deleteMetadata.mutateAsync(roleType);
        addToast({ title: 'Role details removed', variant: 'success' });
      } catch {
        addToast({ title: 'Failed to remove role details', variant: 'error' });
      }
    },
    [deleteMetadata, addToast]
  );

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPendingAvatarFile(file);
      setShowAvatarModal(true);
    },
    []
  );

  const handleAvatarConfirm = useCallback(
    async (file: File) => {
      try {
        const result = await uploadAvatar.mutateAsync(file);
        // Use the server-returned URL (includes cache-busting) for immediate display
        setAvatarPreview(result.data.avatar_url);
        // Refresh auth context so the new URL persists across page refreshes
        await refreshUser();
        addToast({ title: 'Profile picture updated', variant: 'success' });
      } catch {
        addToast({ title: 'Failed to upload profile picture', variant: 'error' });
      } finally {
        setShowAvatarModal(false);
        setPendingAvatarFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [uploadAvatar, refreshUser, addToast]
  );

  const handleAvatarModalClose = useCallback(() => {
    setShowAvatarModal(false);
    setPendingAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Merge data: prefer onboarding profile for enriched fields, fallback to employee
  const mergedData = useMemo(() => {
    const rawBirthday = profile?.birthday ?? employee?.birthday ?? null;
    return {
      nationality: profile?.nationality ?? null,
      contactNumber: profile?.contact_number ?? employee?.phone ?? null,
      emailAddress: profile?.email_address ?? employee?.company_email ?? user?.email ?? null,
      education: profile?.education ?? null,
      major: profile?.major ?? null,
      educationDisplay: profile?.education
        ? profile.major
          ? `${profile.education} — ${profile.major}`
          : profile.education
        : null,
      rawBirthday: rawBirthday ?? null,
      birthday: formatBirthday(rawBirthday),
      age: profile?.age?.toString() ?? calculateAge(rawBirthday),
      address: profile?.address ?? employee?.address ?? null,
      emergencyContactName: profile?.emergency_contact_name ?? employee?.emergency_contact_name ?? null,
      emergencyContactNumber: profile?.emergency_contact_number ?? employee?.emergency_contact_number ?? null,
      companyEmail: profile?.company_email ?? employee?.company_email ?? null,
      emergencyContactRelationship: profile?.emergency_contact_relationship ?? null,
      linkedinUrl: profile?.linkedin_profile_url ?? null,
    };
  }, [profile, employee, user?.email]);

  /** Save handler for each editable section */
  const handleSectionSave = useCallback(
    async (updates: Record<string, string>) => {
      try {
        await updateProfileInfo.mutateAsync(updates);
        addToast({ title: 'Profile updated', variant: 'success' });
      } catch {
        addToast({ title: 'Failed to update profile', variant: 'error' });
      }
    },
    [updateProfileInfo, addToast]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Card skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <Skeleton className="h-24 w-24 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal info section skeleton */}
        <div>
          <Skeleton className="h-6 w-48 mb-1" />
          <Skeleton className="h-4 w-72 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`card-${i.toString()}`}
                className="bg-card border border-border rounded-lg p-5 space-y-4"
                style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                {Array.from({ length: i === 1 ? 4 : i === 4 ? 3 : i === 2 ? 2 : i === 3 ? 1 : 3 }).map(
                  (_, j) => (
                    <div key={`field-${j.toString()}`} className="flex items-start gap-3">
                      <Skeleton className="h-4 w-4 mt-0.5 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
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
        .map((n: string) => n[0])
        .join('') ?? 'U');
  const position = employee?.position ?? 'Position not set';
  const department = employee?.department ?? 'Department not assigned';
  const employeeNumber = employee?.employee_number ?? 'N/A';

  const formattedMetadata = metadataRecords.map((r) => ({
    role_type: r.role_type,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
  }));

  // Build field definitions for each editable section
  const basicInfoFields: EditableField[] = [
    {
      key: 'nationality',
      label: 'Nationality',
      icon: <Flag className="h-4 w-4" />,
      displayValue: mergedData.nationality,
    },
    {
      key: 'birthday',
      label: 'Birthday',
      icon: <Calendar className="h-4 w-4" />,
      displayValue: mergedData.birthday,
      editValue: mergedData.rawBirthday ?? '',
      inputType: 'date',
    },
    {
      key: 'age',
      label: 'Age',
      icon: <User className="h-4 w-4" />,
      displayValue: mergedData.age,
      readOnly: true,
    },
  ];

  const contactFields: EditableField[] = [
    {
      key: 'contactNumber',
      label: 'Contact Number',
      icon: <Phone className="h-4 w-4" />,
      displayValue: mergedData.contactNumber,
      inputType: 'tel',
    },
    {
      key: 'emailAddress',
      label: 'Email Address',
      icon: <Mail className="h-4 w-4" />,
      displayValue: mergedData.emailAddress,
      href: mergedData.emailAddress ? `mailto:${mergedData.emailAddress}` : undefined,
      inputType: 'email',
    },
    {
      key: 'companyEmail',
      label: 'Company Email',
      icon: <Building2 className="h-4 w-4" />,
      displayValue: mergedData.companyEmail,
      href: mergedData.companyEmail ? `mailto:${mergedData.companyEmail}` : undefined,
      inputType: 'email',
    },
    {
      key: 'linkedinProfileUrl',
      label: 'LinkedIn Profile',
      icon: <Linkedin className="h-4 w-4" />,
      displayValue: mergedData.linkedinUrl ? 'View Profile' : null,
      editValue: mergedData.linkedinUrl ?? '',
      href: mergedData.linkedinUrl ?? undefined,
      isExternal: true,
      inputType: 'url',
      placeholder: 'https://linkedin.com/in/...',
    },
  ];

  const educationFields: EditableField[] = [
    {
      key: 'education',
      label: 'Education',
      icon: <GraduationCap className="h-4 w-4" />,
      displayValue: mergedData.educationDisplay,
      editValue: mergedData.education ?? '',
      placeholder: 'e.g. Bachelor of Science in Computer Science',
    },
    {
      key: 'major',
      label: 'Major / Specialization',
      icon: <GraduationCap className="h-4 w-4" />,
      displayValue: mergedData.major,
      placeholder: 'e.g. Software Engineering',
    },
  ];

  const addressFields: EditableField[] = [
    {
      key: 'address',
      label: 'Address',
      icon: <MapPin className="h-4 w-4" />,
      displayValue: mergedData.address,
      placeholder: 'Full address',
    },
  ];

  const emergencyContactFields: EditableField[] = [
    {
      key: 'emergencyContactName',
      label: 'Contact Name',
      icon: <User className="h-4 w-4" />,
      displayValue: mergedData.emergencyContactName,
    },
    {
      key: 'emergencyContactNumber',
      label: 'Contact Number',
      icon: <Phone className="h-4 w-4" />,
      displayValue: mergedData.emergencyContactNumber,
      inputType: 'tel',
    },
    {
      key: 'emergencyContactRelationship',
      label: 'Relationship',
      icon: <Heart className="h-4 w-4" />,
      displayValue: mergedData.emergencyContactRelationship,
      placeholder: 'e.g. Parent, Spouse, Sibling',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative" data-tour="profile-avatar">
              <Avatar className="h-24 w-24">
                {(avatarPreview || user?.avatarUrl) && (
                  <AvatarImage src={avatarPreview ?? user?.avatarUrl} />
                )}
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="hidden"
                aria-label="Upload profile picture"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
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
                {/* Show primary platform & skills from role metadata */}
                {formattedMetadata.map((r) => {
                  const platform = r.metadata.primary_platform;
                  if (typeof platform === 'string' && platform) {
                    return (
                      <Badge key={`platform-${r.role_type}`} variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
                        {platform}
                      </Badge>
                    );
                  }
                  return null;
                })}
                {formattedMetadata.flatMap((r) => {
                  const skills = r.metadata.skills;
                  if (Array.isArray(skills)) {
                    return skills.slice(0, 3).map((skill: unknown) =>
                      typeof skill === 'string' ? (
                        <Badge key={`skill-${skill}`} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ) : null
                    );
                  }
                  return [];
                })}
              </div>
              {!employee && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Complete profile information will be available once your employee record is
                  created
                </p>
              )}
            </div>
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
          <EditableProfileSection
            title="Basic Info"
            titleIcon={<User className="h-4 w-4" />}
            fields={basicInfoFields}
            isLoading={isProfileLoading}
            onSave={handleSectionSave}
            isSaving={updateProfileInfo.isPending}
          />

          <EditableProfileSection
            title="Contact"
            titleIcon={<Phone className="h-4 w-4" />}
            fields={contactFields}
            isLoading={isProfileLoading}
            onSave={handleSectionSave}
            isSaving={updateProfileInfo.isPending}
          />

          <EditableProfileSection
            title="Education"
            titleIcon={<GraduationCap className="h-4 w-4" />}
            fields={educationFields}
            isLoading={isProfileLoading}
            onSave={handleSectionSave}
            isSaving={updateProfileInfo.isPending}
          />

          <EditableProfileSection
            title="Address"
            titleIcon={<MapPin className="h-4 w-4" />}
            fields={addressFields}
            isLoading={isProfileLoading}
            onSave={handleSectionSave}
            isSaving={updateProfileInfo.isPending}
            colSpan={2}
          />

          <EditableProfileSection
            title="Emergency Contact"
            titleIcon={<Heart className="h-4 w-4" />}
            fields={emergencyContactFields}
            isLoading={isProfileLoading}
            onSave={handleSectionSave}
            isSaving={updateProfileInfo.isPending}
          />
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

      {/* Avatar Preview Modal */}
      <AvatarPreviewModal
        file={pendingAvatarFile}
        open={showAvatarModal}
        onClose={handleAvatarModalClose}
        onConfirm={handleAvatarConfirm}
        isUploading={uploadAvatar.isPending}
        initials={initials}
        currentAvatarUrl={avatarPreview ?? user?.avatarUrl}
      />
    </div>
  );
}
