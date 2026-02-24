'use client';

import { useDepartments } from '@/hooks/useDepartments';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Building2, Calendar, Clock, Loader2, Target, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

// Schema for employee assignment (probation tracker)
const employeeAssignmentSchema = z.object({
  department: z.string().min(1, 'Department is required'),
  stage: z.coerce.number().min(1).max(4, 'Stage must be between 1 and 4'),
  status: z.enum(['on-track', 'at-risk'], {
    required_error: 'Status is required',
  }),
  probationEndDate: z.string().min(1, 'Probation end date is required'),
});

// Schema for intern assignment
const internAssignmentSchema = z.object({
  department: z.string().min(1, 'Department is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  requiredHours: z.coerce.number().min(1, 'Required hours must be at least 1'),
  school: z.string().optional(),
  program: z.string().optional(),
});

type EmployeeAssignmentData = z.infer<typeof employeeAssignmentSchema>;
type InternAssignmentData = z.infer<typeof internAssignmentSchema>;

interface AssignmentData {
  userId: string;
  fullName: string;
  email: string;
  role: 'employee' | 'intern';
  position: string | null;
}

interface AssignEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentData: AssignmentData | null;
  onSuccess?: () => void;
}

export function AssignEmployeeModal({
  open,
  onOpenChange,
  assignmentData,
  onSuccess,
}: AssignEmployeeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const departmentsQuery = useDepartments();

  const isEmployee = assignmentData?.role === 'employee';
  const isIntern = assignmentData?.role === 'intern';

  const {
    register: registerEmployee,
    handleSubmit: handleSubmitEmployee,
    reset: resetEmployee,
    control: controlEmployee,
    formState: { errors: employeeErrors },
  } = useForm<EmployeeAssignmentData>({
    resolver: zodResolver(employeeAssignmentSchema),
    defaultValues: {
      department: '',
      stage: 1,
      status: 'on-track' as const,
      // Default probation to 90 days from today
      probationEndDate:
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
    },
  });

  const {
    register: registerIntern,
    handleSubmit: handleSubmitIntern,
    reset: resetIntern,
    control: controlIntern,
    formState: { errors: internErrors },
  } = useForm<InternAssignmentData>({
    resolver: zodResolver(internAssignmentSchema),
    defaultValues: {
      department: '',
      requiredHours: 480,
      // Default internship period to 3 months from today
      startDate: new Date().toISOString().split('T')[0] || '',
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
    },
  });

  const onSubmitEmployee = async (data: EmployeeAssignmentData) => {
    if (!assignmentData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/users/assign-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignmentData.userId,
          department: data.department,
          stage: data.stage,
          status: data.status,
          probationEndDate: data.probationEndDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Assignment failed' }));
        throw new Error(errorData.error || 'Failed to assign employee');
      }

      handleClose();
      onSuccess?.();
    } catch (err) {
      console.error('Employee assignment error:', err);
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitIntern = async (data: InternAssignmentData) => {
    if (!assignmentData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/users/assign-intern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignmentData.userId,
          department: data.department,
          startDate: data.startDate,
          endDate: data.endDate,
          requiredHours: data.requiredHours,
          school: data.school,
          program: data.program,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Assignment failed' }));
        throw new Error(errorData.error || 'Failed to assign intern');
      }

      handleClose();
      onSuccess?.();
    } catch (err) {
      console.error('Intern assignment error:', err);
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetEmployee();
    resetIntern();
    setError(null);
    onOpenChange(false);
  };

  if (!assignmentData) return null;

  // Extract departments list safely
  let departmentList: any[] = [];
  if (Array.isArray(departmentsQuery.data)) {
    departmentList = departmentsQuery.data;
  } else if (
    departmentsQuery.data &&
    typeof departmentsQuery.data === 'object' &&
    'data' in departmentsQuery.data
  ) {
    departmentList = (departmentsQuery.data as any).data || [];
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            {isEmployee ? 'Assign Employee to Probation Tracker' : 'Assign Intern Details'}
          </DialogTitle>
          <DialogDescription>
            {isEmployee
              ? 'Set up the probation period and organizational placement for this new employee.'
              : 'Configure the internship period and requirements for this new intern.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{assignmentData.fullName}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{assignmentData.email}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Position: {assignmentData.position || 'Not specified'}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  isIntern
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                }`}
              >
                {isIntern ? 'Intern' : 'Employee'}
              </span>
            </div>
          </div>

          {/* Employee Form */}
          {isEmployee && (
            <form onSubmit={handleSubmitEmployee(onSubmitEmployee)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  Department *
                </Label>
                <Controller
                  name="department"
                  control={controlEmployee}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="department" name="department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentList.length > 0 ? (
                          departmentList.map((dept: any) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Engineering">Engineering</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="HR">Human Resources</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {employeeErrors.department && (
                  <p className="text-sm text-red-600">{employeeErrors.department.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage">
                    <Target className="inline h-4 w-4 mr-1" />
                    Probation Stage *
                  </Label>
                  <Controller
                    name="stage"
                    control={controlEmployee}
                    render={({ field }) => (
                      <Select
                        value={String(field.value)}
                        onValueChange={(value) => field.onChange(Number(value))}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="stage" name="stage">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Stage 1 - Orientation</SelectItem>
                          <SelectItem value="2">Stage 2 - Training</SelectItem>
                          <SelectItem value="3">Stage 3 - Practice</SelectItem>
                          <SelectItem value="4">Stage 4 - Evaluation</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {employeeErrors.stage && (
                    <p className="text-sm text-red-600">{employeeErrors.stage.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    <TrendingUp className="inline h-4 w-4 mr-1" />
                    Status *
                  </Label>
                  <Controller
                    name="status"
                    control={controlEmployee}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="status" name="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on-track">On Track</SelectItem>
                          <SelectItem value="at-risk">At Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {employeeErrors.status && (
                    <p className="text-sm text-red-600">{employeeErrors.status.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="probationEndDate">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Probation End Date *
                </Label>
                <Input
                  id="probationEndDate"
                  type="date"
                  autoComplete="off"
                  {...registerEmployee('probationEndDate')}
                  disabled={isSubmitting}
                />
                {employeeErrors.probationEndDate && (
                  <p className="text-sm text-red-600">{employeeErrors.probationEndDate.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Complete Assignment'
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Intern Form */}
          {isIntern && (
            <form onSubmit={handleSubmitIntern(onSubmitIntern)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="intern-department">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  Department *
                </Label>
                <Controller
                  name="department"
                  control={controlIntern}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="intern-department" name="department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentList.length > 0 ? (
                          departmentList.map((dept: any) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Engineering">Engineering</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="HR">Human Resources</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {internErrors.department && (
                  <p className="text-sm text-red-600">{internErrors.department.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Start Date *
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    autoComplete="off"
                    {...registerIntern('startDate')}
                    disabled={isSubmitting}
                  />
                  {internErrors.startDate && (
                    <p className="text-sm text-red-600">{internErrors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    End Date *
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    autoComplete="off"
                    {...registerIntern('endDate')}
                    disabled={isSubmitting}
                  />
                  {internErrors.endDate && (
                    <p className="text-sm text-red-600">{internErrors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredHours">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Required Hours *
                </Label>
                <Input
                  id="requiredHours"
                  type="number"
                  min="1"
                  autoComplete="off"
                  {...registerIntern('requiredHours')}
                  disabled={isSubmitting}
                />
                {internErrors.requiredHours && (
                  <p className="text-sm text-red-600">{internErrors.requiredHours.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school">School (Optional)</Label>
                  <Input
                    id="school"
                    placeholder="e.g., University of XYZ"
                    autoComplete="organization"
                    {...registerIntern('school')}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="program">Program (Optional)</Label>
                  <Input
                    id="program"
                    placeholder="e.g., BS Computer Science"
                    autoComplete="off"
                    {...registerIntern('program')}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Complete Assignment'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
