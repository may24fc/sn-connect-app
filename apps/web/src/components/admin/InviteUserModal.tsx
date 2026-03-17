'use client';

import { useInviteUser } from '@/hooks/useUserManagement';
import { zodResolver } from '@hookform/resolvers/zod';
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
  role: z.enum(['employee', 'intern'], {
    required_error: 'Role is required',
  }),
  position: z.string().optional(),
  departmentId: z.string().uuid('Invalid department ID').optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: 'employee' | 'intern';
  departments?: Array<{ id: string; name: string }>;
}

export function InviteUserModal({
  open,
  onOpenChange,
  defaultRole,
  departments = [],
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
    },
  });

  const inviteUser = useInviteUser();

  const onSubmit = async (data: InviteFormData) => {
    try {
      const result = await inviteUser.mutateAsync({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        position: data.position,
        departmentId: data.departmentId,
      });

      // Show credentials to admin
      setInvitedCredentials({
        email: result.data.email,
        temporaryPassword: result.data.temporaryPassword,
      });
    } catch (error) {
      console.error('Failed to invite user:', error);
    }
  };

  const handleCopy = async (field: 'email' | 'password', value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleClose = () => {
    reset();
    setInvitedCredentials(null);
    setCopiedField(null);
    onOpenChange(false);
  };

  const selectedRole = watch('role');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!invitedCredentials ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-slate-700" />
                Invite New {defaultRole === 'intern' ? 'Intern' : 'Employee'}
              </DialogTitle>
              <DialogDescription>
                Create a new user account. They will receive login credentials to complete their
                onboarding.
              </DialogDescription>
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
                  onValueChange={(value) => setValue('role', value as 'employee' | 'intern')}
                  disabled={inviteUser.isPending || !!defaultRole}
                >
                  <SelectTrigger id="role" className={errors.role ? 'border-rose-500' : ''}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </FormGroup>

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

              {departments.length > 0 && (
                <FormGroup
                  label="Department"
                  htmlFor="department"
                  icon={<Building2 className="h-3.5 w-3.5" />}
                >
                  <Select
                    value={watch('departmentId') ?? ''}
                    onValueChange={(value) => setValue('departmentId', value)}
                    disabled={inviteUser.isPending}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormGroup>
              )}

              {inviteUser.isError && (
                <div className="flex items-start gap-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3.5 text-sm text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-2 fade-in duration-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Failed to invite user. Please try again.</span>
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
                  ⚠️ <strong>Important:</strong> This password will only be shown once. Make sure to
                  share it securely with the new user.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
