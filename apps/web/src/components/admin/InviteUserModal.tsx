'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy, Loader2, Mail, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@hr-portal/ui/primitives/dialog';
import { Button } from '@hr-portal/ui/primitives/button';
import { Input } from '@hr-portal/ui/primitives/input';
import { Label } from '@hr-portal/ui/primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui/primitives/select';
import { useInviteUser } from '@/hooks/useUserManagement';

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
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(
    null
  );

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
                <UserPlus className="h-5 w-5 text-indigo-600" />
                Invite New {defaultRole === 'intern' ? 'Intern' : 'Employee'}
              </DialogTitle>
              <DialogDescription>
                Create a new user account. They will receive login credentials
                to complete their onboarding.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@example.com"
                  {...register('email')}
                  disabled={inviteUser.isPending}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register('firstName')}
                    disabled={inviteUser.isPending}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...register('lastName')}
                    disabled={inviteUser.isPending}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) =>
                    setValue('role', value as 'employee' | 'intern')
                  }
                  disabled={inviteUser.isPending || !!defaultRole}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  placeholder="Software Engineer"
                  {...register('position')}
                  disabled={inviteUser.isPending}
                />
              </div>

              {departments.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
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
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={inviteUser.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteUser.isPending}>
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

              {inviteUser.isError && (
                <p className="text-sm text-red-600">
                  Failed to invite user. Please try again.
                </p>
              )}
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
                Share these credentials with the new user. They will be prompted
                to complete onboarding on first login.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-zinc-500">Email</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-sm font-mono bg-white dark:bg-zinc-800 px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700">
                        {invitedCredentials.email}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleCopy('email', invitedCredentials.email)
                        }
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
                    <Label className="text-xs text-zinc-500">
                      Temporary Password
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-sm font-mono bg-white dark:bg-zinc-800 px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700">
                        {invitedCredentials.temporaryPassword}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleCopy(
                            'password',
                            invitedCredentials.temporaryPassword
                          )
                        }
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
                  ⚠️ <strong>Important:</strong> This password will only be
                  shown once. Make sure to share it securely with the new user.
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
