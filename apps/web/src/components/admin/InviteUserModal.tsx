'use client';

import { useDepartments } from '@/hooks/useDepartments';
import { useDivisions } from '@/hooks/useDivisions';
import { type InviteUserRole, useInviteUser } from '@/hooks/useUserManagement';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox, useToast } from '@hr-portal/ui';
import { FormGroup } from '@hr-portal/ui/components/forms';
import { Button } from '@hr-portal/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@hr-portal/ui/primitives/dialog';
import { Input } from '@hr-portal/ui/primitives/input';
import { Label } from '@hr-portal/ui/primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui/primitives/select';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Check,
  Copy,
  Loader2,
  Mail,
  CalendarDays,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['employee', 'associate', 'admin', 'super_admin'], {
    required_error: 'Role is required',
  }),
  probationMode: z.enum(['under_probation', 'no_probation']).optional(),
  probationAuto90: z.boolean().optional(),
  probationDays: z.coerce.number().int().min(1).max(365).optional(),
  position: z.string().optional(),
  departmentId: z.string().uuid('Invalid department ID').optional(),
  divisionId: z.string().uuid('Invalid division ID').optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;
const UNASSIGNED_ORG_VALUE = '__org_unassigned__';

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const roleLabels: Record<InviteUserRole, string> = {
  employee: 'Employee',
  associate: 'Associate',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: InviteUserRole;
  allowedRoles?: InviteUserRole[];
  departments?: Array<{ id: string; name: string }>;
  divisions?: Array<{ id: string; name: string }>;
}

export function InviteUserModal({
  open,
  onOpenChange,
  defaultRole,
  allowedRoles,
  departments = [],
  divisions = [],
}: InviteUserModalProps) {
  const [invitedCredentials, setInvitedCredentials] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: defaultRole || 'employee',
      probationMode: 'under_probation',
      probationAuto90: true,
      probationDays: 90,
    },
  });

  const inviteUser = useInviteUser();
  const { addToast } = useToast();
  const departmentsQuery = useDepartments({ page: 1, pageSize: 200 });
  const divisionsQuery = useDivisions({ page: 1, pageSize: 200 });
  const availableRoles = allowedRoles ?? (defaultRole ? [defaultRole] : ['employee', 'associate']);
  const departmentOptions = departments.length > 0 ? departments : departmentsQuery.data?.data ?? [];
  const divisionOptions = divisions.length > 0 ? divisions : divisionsQuery.data?.data ?? [];

  const onSubmit = async (data: InviteFormData) => {
    try {
      const isEmployeeInvite = data.role === 'employee';
      const shouldApplyProbation = isEmployeeInvite && (data.probationMode ?? 'under_probation') === 'under_probation';
      const isAuto90 = shouldApplyProbation ? (data.probationAuto90 ?? true) : false;

      if (shouldApplyProbation && !isAuto90 && !data.probationDays) {
        addToast({
          title: 'Probation duration is required',
          description: 'Enter manual days left when auto 90 days is turned off.',
          variant: 'error',
        });
        return;
      }

      const probationEndDate =
        shouldApplyProbation && !isAuto90
          ? formatDateOnly(new Date(Date.now() + (data.probationDays ?? 90) * 24 * 60 * 60 * 1000))
          : undefined;

      const result = await inviteUser.mutateAsync({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        position: data.position,
        departmentId: data.departmentId,
        divisionId: data.divisionId,
        ...(isEmployeeInvite
          ? { probationMode: data.probationMode ?? 'under_probation' }
          : {}),
        probationAuto90: shouldApplyProbation ? isAuto90 : false,
        ...(probationEndDate ? { probationEndDate } : {}),
      });

      // Show credentials to admin
      setInvitedCredentials({
        email: result.data.email,
        temporaryPassword: result.data.temporaryPassword,
      });

      if (result.data.reinvite) {
        addToast({
          title: 'Invite refreshed',
          description: 'Existing pending onboarding user was re-invited with a new temporary password.',
          variant: 'success',
        });
      } else {
        const invitedRoleLabel = roleLabels[data.role];
        const nextStepDescription =
          data.role === 'employee' || data.role === 'associate'
            ? `${data.firstName} ${data.lastName} can now sign in and complete onboarding.`
            : `${data.firstName} ${data.lastName} can now sign in with ${invitedRoleLabel.toLowerCase()} access.`;
        addToast({
          title: `${invitedRoleLabel} invited`,
          description: nextStepDescription,
          variant: 'success',
        });
      }

      if (result.data.emailSent === false) {
        addToast({
          title: 'Invite created, but email was not sent',
          description: 'Please share the temporary credentials manually while email delivery is unavailable.',
          variant: 'error',
        });
      } else {
        addToast({
          title: 'Invite email sent',
          description: `An invitation email was sent to ${result.data.email}.`,
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to invite user:', error);
      addToast({
        title: 'Failed to invite user',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  const handleCopy = async (field: 'email' | 'password', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);

      addToast({
        title: field === 'email' ? 'Email copied' : 'Temporary password copied',
        variant: 'success',
      });
    } catch {
      addToast({
        title: 'Copy failed',
        description: 'Please copy manually.',
        variant: 'error',
      });
    }
  };

  const handleClose = () => {
    reset();
    setInvitedCredentials(null);
    setCopiedField(null);
    onOpenChange(false);
  };

  const selectedRole = watch('role');
  const probationMode = watch('probationMode') ?? 'under_probation';
  const probationAuto90 = watch('probationAuto90') ?? true;
  const probationDays = watch('probationDays') ?? 90;
  const isEmployeeRole = selectedRole === 'employee';
  const selectedRoleLabel = roleLabels[selectedRole];
  const modalTitle = defaultRole ? `Invite New ${roleLabels[defaultRole]}` : 'Invite New User';
  const isPrivilegedRole = selectedRole === 'admin' || selectedRole === 'super_admin';
  const description = isPrivilegedRole
    ? 'Create a privileged account. These users are activated immediately and should be invited only when elevated access is required.'
    : 'Create a new user account. They will receive login credentials to complete their onboarding.';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!invitedCredentials ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-slate-700" />
                {modalTitle}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FormGroup
                label="Email Address"
                htmlFor="email"
                required
                showOptional={false}
                error={errors.email?.message}
                icon={<Mail className="h-3.5 w-3.5" />}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@example.com"
                  {...register('email')}
                  disabled={inviteUser.isPending}
                  error={!!errors.email}
                  className="h-10"
                />
              </FormGroup>

              <div className="grid grid-cols-2 gap-4">
                <FormGroup
                  label="First Name"
                  htmlFor="firstName"
                  required
                  showOptional={false}
                  error={errors.firstName?.message}
                  icon={<User className="h-3.5 w-3.5" />}
                >
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register('firstName')}
                    disabled={inviteUser.isPending}
                    error={!!errors.firstName}
                    className="h-10"
                  />
                </FormGroup>

                <FormGroup
                  label="Last Name"
                  htmlFor="lastName"
                  required
                  showOptional={false}
                  error={errors.lastName?.message}
                >
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...register('lastName')}
                    disabled={inviteUser.isPending}
                    error={!!errors.lastName}
                    className="h-10"
                  />
                </FormGroup>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormGroup
                  label="Role"
                  htmlFor="role"
                  required
                  showOptional={false}
                  error={errors.role?.message}
                  icon={<Users className="h-3.5 w-3.5" />}
                >
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => setValue('role', value as InviteUserRole)}
                    disabled={inviteUser.isPending || !!defaultRole}
                  >
                    <SelectTrigger id="role" className={errors.role ? 'border-rose-500' : ''}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormGroup>

                <FormGroup
                  label="Probation Status"
                  htmlFor="probation-status"
                  required
                  showOptional={false}
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                >
                  <Select
                    value={probationMode}
                    onValueChange={(value) => setValue('probationMode', value as 'under_probation' | 'no_probation')}
                    disabled={inviteUser.isPending || !isEmployeeRole}
                  >
                    <SelectTrigger id="probation-status">
                      <SelectValue placeholder="Select probation status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under_probation">Probationary</SelectItem>
                      <SelectItem value="no_probation">Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                </FormGroup>
              </div>

              {isEmployeeRole && probationMode === 'under_probation' && (
                <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center space-x-2.5">
                    <Checkbox
                      id="probation-auto-90"
                      checked={probationAuto90}
                      onCheckedChange={(checked) => setValue('probationAuto90', checked === true)}
                      disabled={inviteUser.isPending}
                    />
                    <Label htmlFor="probation-auto-90" className="cursor-pointer select-none">
                      Auto-set to 90 days
                    </Label>
                  </div>

                  {!probationAuto90 && (
                    <FormGroup
                      label="Manual days left"
                      htmlFor="probation-days"
                      required
                      showOptional={false}
                      error={errors.probationDays?.message}
                    >
                      <Input
                        id="probation-days"
                        type="number"
                        min={1}
                        max={365}
                        placeholder="Enter number of days"
                        {...register('probationDays')}
                        disabled={inviteUser.isPending}
                        error={!!errors.probationDays}
                        className="h-10"
                      />
                    </FormGroup>
                  )}

                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {probationAuto90
                      ? 'Probation end date will be auto-set to 90 days after assignment.'
                      : `Probation end date will be computed from ${probationDays} day${probationDays === 1 ? '' : 's'}.`}
                  </p>
                </div>
              )}

              {isPrivilegedRole && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Privileged invites skip onboarding and become active immediately. Only create this account if elevated access is required.
                </div>
              )}

              <FormGroup
                label="Position"
                htmlFor="position"
                icon={<Briefcase className="h-3.5 w-3.5" />}
              >
                <Input
                  id="position"
                  placeholder="Software Engineer"
                  {...register('position')}
                  disabled={inviteUser.isPending}
                  className="h-10"
                />
              </FormGroup>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormGroup
                  label="Department"
                  htmlFor="department"
                  icon={<Building2 className="h-3.5 w-3.5" />}
                >
                  <Select
                    value={watch('departmentId') ?? UNASSIGNED_ORG_VALUE}
                    onValueChange={(value) =>
                      setValue('departmentId', value === UNASSIGNED_ORG_VALUE ? undefined : value)
                    }
                    disabled={inviteUser.isPending || departmentsQuery.isLoading}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_ORG_VALUE}>Assign later</SelectItem>
                      {departmentOptions.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormGroup>

                <FormGroup
                  label="Division"
                  htmlFor="division"
                  icon={<Building2 className="h-3.5 w-3.5" />}
                >
                  <Select
                    value={watch('divisionId') ?? UNASSIGNED_ORG_VALUE}
                    onValueChange={(value) =>
                      setValue('divisionId', value === UNASSIGNED_ORG_VALUE ? undefined : value)
                    }
                    disabled={inviteUser.isPending || divisionsQuery.isLoading}
                  >
                    <SelectTrigger id="division">
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_ORG_VALUE}>Assign later</SelectItem>
                      {divisionOptions.map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormGroup>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Department and Division are optional during invite and can be finalized during assignment.
              </p>

              {inviteUser.isError && (
                <div className="flex items-start gap-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3.5 text-sm text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-2 fade-in duration-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {inviteUser.error instanceof Error
                      ? inviteUser.error.message
                      : 'Failed to invite user. Please try again.'}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={inviteUser.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteUser.isPending} className="min-w-[120px]">
                  {inviteUser.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invite
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                User Invited Successfully
              </DialogTitle>
              <DialogDescription>
                Share these credentials with the new user. They will be prompted to complete
                onboarding on first login.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Role</Label>
                    <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedRoleLabel}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Email</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-sm font-mono bg-card px-3 py-2 rounded border border-border">
                        {invitedCredentials.email}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy('email', invitedCredentials.email)}
                      >
                        {copiedField === 'email' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-zinc-500 dark:text-zinc-400">Temporary Password</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-sm font-mono bg-card px-3 py-2 rounded border border-border">
                        {invitedCredentials.temporaryPassword}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy('password', invitedCredentials.temporaryPassword)}
                      >
                        {copiedField === 'password' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Important:</strong> This password will only be shown once. Make sure to share it securely with the new user.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleClose}><Check className="mr-2 h-4 w-4" />Done</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
