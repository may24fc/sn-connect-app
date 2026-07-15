'use client';

import { useCreateDepartment, useDepartments } from '@/hooks/useDepartments';
import { useCreateDivision, useDivisions } from '@/hooks/useDivisions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@hr-portal/ui';
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
  Building2,
  Calendar,
  Clock,
  Loader2,
  Plus,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

type OrganizationOption = {
  id: string;
  name: string;
};

type EmploymentStatus = 'probationary' | 'confirmed';

const employeeAssignmentSchema = z
  .object({
    departmentId: z.string().min(1, 'Department is required'),
    divisionId: z.string().min(1, 'Division is required'),
    employmentStatus: z.enum(['probationary', 'confirmed'], {
      required_error: 'Employment status is required',
    }),
    stage: z.coerce.number().min(1).max(3).optional(),
    status: z.enum(['on-track', 'at-risk']).optional(),
    probationEndDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.employmentStatus !== 'probationary') {
      return;
    }

    if (!data.stage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Probation stage is required',
        path: ['stage'],
      });
    }

    if (!data.status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Status is required',
        path: ['status'],
      });
    }

    if (!data.probationEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Probation end date is required',
        path: ['probationEndDate'],
      });
    }
  });

const internAssignmentSchema = z.object({
  departmentId: z.string().min(1, 'Department is required'),
  divisionId: z.string().min(1, 'Division is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  requiredHours: z.coerce.number().min(1, 'Required hours must be at least 1'),
  weeklyRequiredHours: z.coerce.number().min(1, 'Weekly hours must be at least 1').default(20),
  school: z.string().optional(),
  program: z.string().optional(),
});

type EmployeeAssignmentData = z.infer<typeof employeeAssignmentSchema>;
type InternAssignmentData = z.infer<typeof internAssignmentSchema>;

interface AssignmentData {
  userId: string;
  fullName: string;
  email: string;
  role: 'employee' | 'associate';
  position: string | null;
  inviteProbationMode?: 'under_probation' | 'no_probation';
  inviteProbationAuto90?: boolean;
  inviteProbationEndDate?: string | null;
  departmentId?: string;
  departmentName?: string | null;
  divisionId?: string;
  divisionName?: string | null;
  employmentStatus?: EmploymentStatus;
  stage?: 1 | 2 | 3 | 4;
  status?: 'on-track' | 'at-risk';
  probationEndDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  requiredHours?: number | null;
  weeklyRequiredHours?: number | null;
  school?: string | null;
  program?: string | null;
}

interface AssignmentSuccessPayload {
  role: 'employee' | 'associate';
  employmentStatus?: EmploymentStatus;
}

type AssignmentModalMode =
  | 'employee-assignment'
  | 'employee-probation'
  | 'associate-assignment';

interface AssignEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentData: AssignmentData | null;
  mode?: AssignmentModalMode;
  onSuccess?: (result: AssignmentSuccessPayload) => void;
}

interface OrganizationSelectFieldProps {
  label: 'Department' | 'Division';
  fieldId: string;
  createId: string;
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: OrganizationOption[];
  placeholder: string;
  error: string | undefined;
  helpText: string;
  loading: boolean;
  hasError: boolean;
  disabled: boolean;
  showCreateForm: boolean;
  onOpenCreate: () => void;
  newValue: string;
  onNewValueChange: (value: string) => void;
  createError: string | null;
  onCancelCreate: () => void;
  onCreate: () => void;
  isCreating: boolean;
}

function getDateAfterDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '';
}

function inferEmploymentStatus(assignmentData: AssignmentData | null): EmploymentStatus {
  return assignmentData?.inviteProbationMode === 'no_probation' ? 'confirmed' : 'probationary';
}

function inferProbationStage(probationEndDate?: string | null): 1 | 2 | 3 {
  if (!probationEndDate) {
    return 3;
  }

  const endDate = new Date(probationEndDate);
  if (Number.isNaN(endDate.getTime())) {
    return 3;
  }

  const diffInDays = Math.ceil((endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  if (diffInDays <= 30) {
    return 1;
  }

  if (diffInDays <= 60) {
    return 2;
  }

  return 3;
}

function getStageEndDate(stage: number): string {
  if (stage === 1) {
    return getDateAfterDays(30);
  }

  if (stage === 2) {
    return getDateAfterDays(60);
  }

  return getDateAfterDays(90);
}

function getOptionsFromQueryData(data: unknown): OrganizationOption[] {
  if (Array.isArray(data)) {
    return data as OrganizationOption[];
  }

  if (data && typeof data === 'object' && 'data' in data) {
    const nestedData = (data as { data?: unknown }).data;
    return Array.isArray(nestedData) ? (nestedData as OrganizationOption[]) : [];
  }

  return [];
}

function findOptionIdByName(
  options: OrganizationOption[],
  name: string | null | undefined
): string {
  const normalizedName = String(name ?? '').trim().toLowerCase();

  if (!normalizedName) {
    return '';
  }

  const match = options.find((option) => option.name.trim().toLowerCase() === normalizedName);
  return match?.id ?? '';
}

function OrganizationSelectField({
  label,
  fieldId,
  createId,
  value,
  onValueChange,
  options,
  placeholder,
  error,
  helpText,
  loading,
  hasError,
  disabled,
  showCreateForm,
  onOpenCreate,
  newValue,
  onNewValueChange,
  createError,
  onCancelCreate,
  onCreate,
  isCreating,
}: OrganizationSelectFieldProps) {
  const labelLower = label.toLowerCase();

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>
        <Building2 className="mr-1 inline h-4 w-4" />
        {label} *
      </Label>
      <Select value={value ?? ''} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={fieldId} name={fieldId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-xs text-zinc-500 dark:text-zinc-400">
          {loading
            ? `Loading ${labelLower}s...`
            : hasError
              ? `Unable to load the saved ${labelLower}s right now.`
              : helpText}
        </div>
        {!showCreateForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isCreating}
            onClick={onOpenCreate}
          >
            <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Create {labelLower}
          </Button>
        )}
      </div>
      {showCreateForm && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={createId}>New {labelLower} name</Label>
              <Input
                id={createId}
                value={newValue}
                onChange={(event) => onNewValueChange(event.target.value)}
                placeholder={`Enter ${labelLower} name`}
                disabled={isCreating}
              />
            </div>
            {createError && (
              <p className="text-sm text-rose-600 dark:text-rose-400">{createError}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isCreating}
                onClick={onCancelCreate}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={isCreating} onClick={onCreate}>
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AssignEmployeeModal({
  open,
  onOpenChange,
  assignmentData,
  mode,
  onSuccess,
}: AssignEmployeeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDepartmentForm, setShowCreateDepartmentForm] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [createDepartmentError, setCreateDepartmentError] = useState<string | null>(null);
  const [showCreateDivisionForm, setShowCreateDivisionForm] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState('');
  const [createDivisionError, setCreateDivisionError] = useState<string | null>(null);
  const departmentsQuery = useDepartments({ page: 1, pageSize: 200 });
  const divisionsQuery = useDivisions({ page: 1, pageSize: 200 });
  const createDepartmentMutation = useCreateDepartment();
  const createDivisionMutation = useCreateDivision();
  const { addToast } = useToast();

  const isEmployee = assignmentData?.role === 'employee';
  const isIntern = assignmentData?.role === 'associate';

  const {
    register: registerEmployee,
    handleSubmit: handleSubmitEmployee,
    reset: resetEmployee,
    watch: watchEmployee,
    getValues: getEmployeeValues,
    control: controlEmployee,
    setValue: setEmployeeValue,
    formState: { errors: employeeErrors },
  } = useForm<EmployeeAssignmentData>({
    resolver: zodResolver(employeeAssignmentSchema),
    defaultValues: {
      departmentId: '',
      divisionId: '',
      employmentStatus: 'probationary',
      stage: 3,
      status: 'on-track',
      probationEndDate: getDateAfterDays(90),
    },
  });

  const {
    register: registerIntern,
    handleSubmit: handleSubmitIntern,
    reset: resetIntern,
    watch: watchIntern,
    getValues: getInternValues,
    setValue: setInternValue,
    formState: { errors: internErrors },
  } = useForm<InternAssignmentData>({
    resolver: zodResolver(internAssignmentSchema),
    defaultValues: {
      departmentId: '',
      divisionId: '',
      requiredHours: 480,
      startDate: new Date().toISOString().split('T')[0] || '',
      endDate: getDateAfterDays(90),
    },
  });

  const employmentStatus = watchEmployee('employmentStatus');

  const departmentList = getOptionsFromQueryData(departmentsQuery.data);
  const divisionList = getOptionsFromQueryData(divisionsQuery.data);
  const resolvedMode: AssignmentModalMode =
    mode ?? (isIntern ? 'associate-assignment' : 'employee-assignment');
  const isEmployeeProbationMode = resolvedMode === 'employee-probation';

  useEffect(() => {
    if (!open || !assignmentData || assignmentData.role !== 'employee') {
      return;
    }

    const nextEmploymentStatus =
      assignmentData.employmentStatus ??
      (isEmployeeProbationMode ? 'probationary' : inferEmploymentStatus(assignmentData));
    const currentStage = assignmentData.stage
      ? (Math.min(assignmentData.stage, 3) as 1 | 2 | 3)
      : assignmentData.inviteProbationAuto90 === false
        ? inferProbationStage(assignmentData.inviteProbationEndDate)
        : 3;
    const defaultEndDate =
      assignmentData.probationEndDate ??
      assignmentData.inviteProbationEndDate ??
      getStageEndDate(currentStage);

    resetEmployee({
      departmentId: assignmentData.departmentId ?? '',
      divisionId: assignmentData.divisionId ?? '',
      employmentStatus: nextEmploymentStatus,
      stage: currentStage,
      status: assignmentData.status ?? 'on-track',
      probationEndDate: nextEmploymentStatus === 'probationary' ? defaultEndDate : '',
    });
  }, [assignmentData, isEmployeeProbationMode, open, resetEmployee]);

  useEffect(() => {
    if (!open || !assignmentData || assignmentData.role !== 'associate') {
      return;
    }

    resetIntern({
      departmentId: assignmentData.departmentId ?? '',
      divisionId: assignmentData.divisionId ?? '',
      requiredHours: assignmentData.requiredHours ?? 480,
      weeklyRequiredHours: assignmentData.weeklyRequiredHours ?? 20,
      startDate: assignmentData.startDate ?? new Date().toISOString().split('T')[0] ?? '',
      endDate: assignmentData.endDate ?? getDateAfterDays(90),
      school: assignmentData.school ?? '',
      program: assignmentData.program ?? '',
    });
  }, [assignmentData, open, resetIntern]);

  useEffect(() => {
    if (!open || !assignmentData || assignmentData.role !== 'employee') {
      return;
    }

    const employeeValues = getEmployeeValues();

    if (!employeeValues.departmentId && assignmentData.departmentName) {
      const matchedDepartmentId = findOptionIdByName(departmentList, assignmentData.departmentName);
      if (matchedDepartmentId) {
        setEmployeeValue('departmentId', matchedDepartmentId, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }

    if (!employeeValues.divisionId && assignmentData.divisionName) {
      const matchedDivisionId = findOptionIdByName(divisionList, assignmentData.divisionName);
      if (matchedDivisionId) {
        setEmployeeValue('divisionId', matchedDivisionId, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }
  }, [assignmentData, departmentList, divisionList, getEmployeeValues, open, setEmployeeValue]);

  useEffect(() => {
    if (!open || !assignmentData || assignmentData.role !== 'associate') {
      return;
    }

    const internValues = getInternValues();

    if (!internValues.departmentId && assignmentData.departmentName) {
      const matchedDepartmentId = findOptionIdByName(departmentList, assignmentData.departmentName);
      if (matchedDepartmentId) {
        setInternValue('departmentId', matchedDepartmentId, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }

    if (!internValues.divisionId && assignmentData.divisionName) {
      const matchedDivisionId = findOptionIdByName(divisionList, assignmentData.divisionName);
      if (matchedDivisionId) {
        setInternValue('divisionId', matchedDivisionId, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }
  }, [assignmentData, departmentList, divisionList, getInternValues, open, setInternValue]);

  const dialogTitle = (() => {
    if (resolvedMode === 'employee-probation') {
      return 'Manage Employee Probation';
    }

    if (resolvedMode === 'associate-assignment') {
      return 'Assign Associate Details';
    }

    return isEmployee ? 'Assign Employee Details' : 'Assign Associate Details';
  })();

  const dialogDescription = (() => {
    if (resolvedMode === 'employee-probation') {
      return 'Set or update the probation status, milestone, and end date for this employee.';
    }

    if (resolvedMode === 'associate-assignment') {
      return 'Configure or update the internship placement, dates, and required hours.';
    }

    return isEmployee
      ? 'Set the organizational placement and employment status for this employee.'
      : 'Configure the internship period and requirements for this new associate.';
  })();

  const submitLabel =
    resolvedMode === 'employee-probation'
      ? 'Save Probation'
      : resolvedMode === 'associate-assignment'
        ? 'Save Assignment'
        : 'Save Assignment';

  const handleCreateDepartment = async () => {
    const departmentName = newDepartmentName.trim();

    if (!departmentName) {
      setCreateDepartmentError('Department name is required.');
      return;
    }

    setCreateDepartmentError(null);

    try {
      const result = await createDepartmentMutation.mutateAsync({ name: departmentName });
      await departmentsQuery.refetch();

      if (isEmployee) {
        setEmployeeValue('departmentId', result.data.id, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (isIntern) {
        setInternValue('departmentId', result.data.id, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      setNewDepartmentName('');
      setShowCreateDepartmentForm(false);
      addToast({
        title: 'Department created',
        description: `${result.data.name} is ready to assign.`,
        variant: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create department';
      setCreateDepartmentError(message);
      addToast({ title: message, variant: 'error' });
    }
  };

  const handleCreateDivision = async () => {
    const divisionName = newDivisionName.trim();

    if (!divisionName) {
      setCreateDivisionError('Division name is required.');
      return;
    }

    setCreateDivisionError(null);

    try {
      const result = await createDivisionMutation.mutateAsync({ name: divisionName });
      await divisionsQuery.refetch();

      if (isEmployee) {
        setEmployeeValue('divisionId', result.data.id, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (isIntern) {
        setInternValue('divisionId', result.data.id, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      setNewDivisionName('');
      setShowCreateDivisionForm(false);
      addToast({
        title: 'Division created',
        description: `${result.data.name} is ready to assign.`,
        variant: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create division';
      setCreateDivisionError(message);
      addToast({ title: message, variant: 'error' });
    }
  };

  const handleClose = () => {
    resetEmployee();
    resetIntern();
    setError(null);
    setShowCreateDepartmentForm(false);
    setNewDepartmentName('');
    setCreateDepartmentError(null);
    setShowCreateDivisionForm(false);
    setNewDivisionName('');
    setCreateDivisionError(null);
    onOpenChange(false);
  };

  const onSubmitEmployee = async (data: EmployeeAssignmentData) => {
    if (!assignmentData) {
      return;
    }

    const assignProbation = data.employmentStatus === 'probationary';

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/users/assign-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignmentData.userId,
          departmentId: data.departmentId,
          divisionId: data.divisionId,
          assignProbation,
          stage: assignProbation ? data.stage : undefined,
          status: assignProbation ? data.status : undefined,
          probationEndDate: assignProbation ? data.probationEndDate : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Assignment failed' }));
        throw new Error(errorData.error || 'Failed to assign employee');
      }

      addToast({
        title: 'Assignment completed',
        description: assignProbation
          ? `${assignmentData.fullName} has been assigned as probationary.`
          : `${assignmentData.fullName} has been assigned as confirmed.`,
        variant: 'success',
      });

      handleClose();
      onSuccess?.({ role: 'employee', employmentStatus: data.employmentStatus });
    } catch (err) {
      console.error('Employee assignment error:', err);
      setError(err instanceof Error ? err.message : 'Assignment failed');
      addToast({
        title: 'Failed to complete assignment',
        description: err instanceof Error ? err.message : 'Assignment failed',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitIntern = async (data: InternAssignmentData) => {
    if (!assignmentData) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/users/assign-associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignmentData.userId,
          departmentId: data.departmentId,
          divisionId: data.divisionId,
          startDate: data.startDate,
          endDate: data.endDate,
          requiredHours: data.requiredHours,
          weeklyRequiredHours: data.weeklyRequiredHours,
          school: data.school,
          program: data.program,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Assignment failed' }));
        throw new Error(errorData.error || 'Failed to assign associate');
      }

      addToast({
        title: 'Assignment completed',
        description: `${assignmentData.fullName} has been added as an associate assignment.`,
        variant: 'success',
      });

      handleClose();
      onSuccess?.({ role: 'associate' });
    } catch (err) {
      console.error('Associate assignment error:', err);
      setError(err instanceof Error ? err.message : 'Assignment failed');
      addToast({
        title: 'Failed to complete assignment',
        description: err instanceof Error ? err.message : 'Assignment failed',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!assignmentData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-700" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold">{assignmentData.fullName}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{assignmentData.email}</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
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
                {isIntern ? 'Associate' : 'Employee'}
              </span>
            </div>
          </div>

          {isEmployee && (
            <form onSubmit={handleSubmitEmployee(onSubmitEmployee)} className="space-y-4">
              <OrganizationSelectField
                label="Department"
                fieldId="employee-department"
                createId="employee-new-department-name"
                value={watchEmployee('departmentId')}
                onValueChange={(value) =>
                  setEmployeeValue('departmentId', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                options={departmentList}
                placeholder="Select department"
                error={employeeErrors.departmentId?.message}
                helpText="Departments come from your saved Supabase department list."
                loading={departmentsQuery.isLoading}
                hasError={Boolean(departmentsQuery.isError)}
                disabled={isSubmitting}
                showCreateForm={showCreateDepartmentForm}
                onOpenCreate={() => {
                  setShowCreateDepartmentForm(true);
                  setCreateDepartmentError(null);
                }}
                newValue={newDepartmentName}
                onNewValueChange={setNewDepartmentName}
                createError={createDepartmentError}
                onCancelCreate={() => {
                  setShowCreateDepartmentForm(false);
                  setNewDepartmentName('');
                  setCreateDepartmentError(null);
                }}
                onCreate={() => {
                  void handleCreateDepartment();
                }}
                isCreating={createDepartmentMutation.isPending}
              />

              <OrganizationSelectField
                label="Division"
                fieldId="employee-division"
                createId="employee-new-division-name"
                value={watchEmployee('divisionId')}
                onValueChange={(value) =>
                  setEmployeeValue('divisionId', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                options={divisionList}
                placeholder="Select division"
                error={employeeErrors.divisionId?.message}
                helpText="Divisions come from your saved Supabase division list."
                loading={divisionsQuery.isLoading}
                hasError={Boolean(divisionsQuery.isError)}
                disabled={isSubmitting}
                showCreateForm={showCreateDivisionForm}
                onOpenCreate={() => {
                  setShowCreateDivisionForm(true);
                  setCreateDivisionError(null);
                }}
                newValue={newDivisionName}
                onNewValueChange={setNewDivisionName}
                createError={createDivisionError}
                onCancelCreate={() => {
                  setShowCreateDivisionForm(false);
                  setNewDivisionName('');
                  setCreateDivisionError(null);
                }}
                onCreate={() => {
                  void handleCreateDivision();
                }}
                isCreating={createDivisionMutation.isPending}
              />

              <div className="space-y-2">
                <Label htmlFor="employmentStatus">
                  <Clock className="mr-1 inline h-4 w-4" />
                  Employment Status *
                </Label>
                <Controller
                  name="employmentStatus"
                  control={controlEmployee}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        const nextValue = value as EmploymentStatus;
                        field.onChange(nextValue);

                        if (nextValue === 'confirmed') {
                          setEmployeeValue('probationEndDate', '', {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        } else {
                          const currentStage = watchEmployee('stage') || 3;
                          if (!watchEmployee('probationEndDate')) {
                            setEmployeeValue('probationEndDate', getStageEndDate(currentStage), {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="employmentStatus" name="employmentStatus">
                        <SelectValue placeholder="Select employment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="probationary">Probationary</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {employeeErrors.employmentStatus && (
                  <p className="text-sm text-red-600">{employeeErrors.employmentStatus.message}</p>
                )}
              </div>

              {employmentStatus === 'probationary' ? (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="stage">
                        <Target className="mr-1 inline h-4 w-4" />
                        Probation Stage / Milestone *
                      </Label>
                      <Controller
                        name="stage"
                        control={controlEmployee}
                        render={({ field }) => {
                          const stageValue =
                            typeof field.value === 'number' ? String(field.value) : '';

                          return (
                            <Select
                              value={stageValue}
                              onValueChange={(value) => {
                                const nextStage = Number(value) as 1 | 2 | 3;
                                field.onChange(nextStage);
                                setEmployeeValue('probationEndDate', getStageEndDate(nextStage), {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger id="stage" name="stage">
                                <SelectValue placeholder="Select probation milestone" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">30 Days (1st Review)</SelectItem>
                                <SelectItem value="2">60 Days (2nd Review)</SelectItem>
                                <SelectItem value="3">90 Days (Final Review)</SelectItem>
                              </SelectContent>
                            </Select>
                          );
                        }}
                      />
                      {employeeErrors.stage && (
                        <p className="text-sm text-red-600">{employeeErrors.stage.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">
                        <TrendingUp className="mr-1 inline h-4 w-4" />
                        Status *
                      </Label>
                      <Controller
                        name="status"
                        control={controlEmployee}
                        render={({ field }) => {
                          const statusValue =
                            field.value === 'on-track' || field.value === 'at-risk'
                              ? field.value
                              : '';

                          return (
                            <Select
                              value={statusValue}
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
                          );
                        }}
                      />
                      {employeeErrors.status && (
                        <p className="text-sm text-red-600">{employeeErrors.status.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="probationEndDate">
                      <Calendar className="mr-1 inline h-4 w-4" />
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
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Milestone selection sets a default review window, but the end date can still be adjusted.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Confirmed employees do not need a probation stage. Probation details will be left blank.
                </p>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-end dark:border-zinc-700">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    submitLabel
                  )}
                </Button>
              </div>
            </form>
          )}

          {isIntern && (
            <form onSubmit={handleSubmitIntern(onSubmitIntern)} className="space-y-4">
              <OrganizationSelectField
                label="Department"
                fieldId="associate-department"
                createId="associate-new-department-name"
                value={watchIntern('departmentId') ?? ''}
                onValueChange={(value) =>
                  setInternValue('departmentId', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                options={departmentList}
                placeholder="Select department"
                error={internErrors.departmentId?.message}
                helpText="Departments come from your saved Supabase department list."
                loading={departmentsQuery.isLoading}
                hasError={Boolean(departmentsQuery.isError)}
                disabled={isSubmitting}
                showCreateForm={showCreateDepartmentForm}
                onOpenCreate={() => {
                  setShowCreateDepartmentForm(true);
                  setCreateDepartmentError(null);
                }}
                newValue={newDepartmentName}
                onNewValueChange={setNewDepartmentName}
                createError={createDepartmentError}
                onCancelCreate={() => {
                  setShowCreateDepartmentForm(false);
                  setNewDepartmentName('');
                  setCreateDepartmentError(null);
                }}
                onCreate={() => {
                  void handleCreateDepartment();
                }}
                isCreating={createDepartmentMutation.isPending}
              />

              <OrganizationSelectField
                label="Division"
                fieldId="associate-division"
                createId="associate-new-division-name"
                value={watchIntern('divisionId') ?? ''}
                onValueChange={(value) =>
                  setInternValue('divisionId', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                options={divisionList}
                placeholder="Select division"
                error={internErrors.divisionId?.message}
                helpText="Divisions come from your saved Supabase division list."
                loading={divisionsQuery.isLoading}
                hasError={Boolean(divisionsQuery.isError)}
                disabled={isSubmitting}
                showCreateForm={showCreateDivisionForm}
                onOpenCreate={() => {
                  setShowCreateDivisionForm(true);
                  setCreateDivisionError(null);
                }}
                newValue={newDivisionName}
                onNewValueChange={setNewDivisionName}
                createError={createDivisionError}
                onCancelCreate={() => {
                  setShowCreateDivisionForm(false);
                  setNewDivisionName('');
                  setCreateDivisionError(null);
                }}
                onCreate={() => {
                  void handleCreateDivision();
                }}
                isCreating={createDivisionMutation.isPending}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    <Calendar className="mr-1 inline h-4 w-4" />
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
                    <Calendar className="mr-1 inline h-4 w-4" />
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
                  <Clock className="mr-1 inline h-4 w-4" />
                  Total Required Hours *
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

              <div className="space-y-2">
                <Label htmlFor="weeklyRequiredHours">
                  <Clock className="mr-1 inline h-4 w-4" />
                  Weekly Required Hours *
                </Label>
                <Input
                  id="weeklyRequiredHours"
                  type="number"
                  min="1"
                  autoComplete="off"
                  {...registerIntern('weeklyRequiredHours')}
                  disabled={isSubmitting}
                />
                {internErrors.weeklyRequiredHours && (
                  <p className="text-sm text-red-600">{internErrors.weeklyRequiredHours.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-end dark:border-zinc-700">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    submitLabel
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
