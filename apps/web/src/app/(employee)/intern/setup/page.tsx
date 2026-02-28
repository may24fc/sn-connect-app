'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useInitializeInternship } from '@/hooks/useInternships';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  School,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useCallback, useState } from 'react';

// Common departments matching the existing codebase
const DEPARTMENTS = [
  'Engineering',
  'Human Resources',
  'Marketing',
  'Sales',
  'Finance',
  'Operations',
  'Customer Support',
  'Product',
  'Design',
  'Legal',
  'IT',
  'Administration',
] as const;

interface FormState {
  startDate: string;
  endDate: string;
  department: string;
  school: string;
  program: string;
  requiredHours: string;
}

interface FormErrors {
  startDate?: string;
  endDate?: string;
  department?: string;
  school?: string;
  program?: string;
  requiredHours?: string;
  general?: string;
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.startDate) {
    errors.startDate = 'Start date is required';
  }

  if (!form.endDate) {
    errors.endDate = 'End date is required';
  }

  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = 'End date must be after start date';
  }

  if (!form.department) {
    errors.department = 'Department is required';
  }

  if (!form.school.trim()) {
    errors.school = 'School/University is required';
  }

  if (!form.program.trim()) {
    errors.program = 'Program/Course is required';
  }

  const hours = Number(form.requiredHours);
  if (!form.requiredHours || Number.isNaN(hours) || hours < 1 || hours > 20000) {
    errors.requiredHours = 'Required hours must be between 1 and 20,000';
  }

  return errors;
}

export default function InternSetupPage(): ReactNode {
  const { user } = useAuth();
  const router = useRouter();
  const initializeMutation = useInitializeInternship();

  const [form, setForm] = useState<FormState>({
    startDate: '',
    endDate: '',
    department: '',
    school: '',
    program: '',
    requiredHours: '480',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear field error on change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      delete next.general;
      return next;
    });
  }, []);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    const formErrors = validateForm(form);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    try {
      await initializeMutation.mutateAsync({
        startDate: form.startDate,
        endDate: form.endDate,
        department: form.department,
        school: form.school.trim(),
        program: form.program.trim(),
        requiredHours: Number(form.requiredHours),
      });

      setIsSuccess(true);

      // Redirect to dashboard after brief success message
      setTimeout(() => {
        router.push('/intern/dashboard');
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize internship';
      setErrors({ general: message });
    }
  };

  if (isSuccess) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                strokeWidth={1.5}
              />
            </div>
            <CardTitle>Profile Setup Complete!</CardTitle>
            <CardDescription>
              Your internship record has been created. Redirecting to your dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-indigo-600" strokeWidth={1.5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <GraduationCap
                className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Complete Your Internship Setup
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {user?.name ? `Welcome, ${user.name}!` : 'Welcome!'} Set up your internship profile
                to get started.
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/10 p-4">
          <AlertCircle
            className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5"
            strokeWidth={1.5}
          />
          <div className="text-sm text-indigo-800 dark:text-indigo-200">
            <p className="font-medium">Why do I need to complete this?</p>
            <p className="mt-1 text-indigo-700 dark:text-indigo-300">
              Your internship profile is needed to track hours, submit daily reports, and manage
              your performance reviews. This only needs to be done once.
            </p>
          </div>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 p-4">
            <AlertCircle
              className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0"
              strokeWidth={1.5}
            />
            <p className="text-sm text-rose-800 dark:text-rose-200">{errors.general}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Internship Details</CardTitle>
              <CardDescription>
                Fill in the required information about your internship. You can update these details
                later with your supervisor's help.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Start Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                    error={!!errors.startDate}
                  />
                  {errors.startDate && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.startDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate" className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                    End Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateField('endDate', e.target.value)}
                    error={!!errors.endDate}
                  />
                  {errors.endDate && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Department <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={form.department}
                  onValueChange={(value) => updateField('department', value)}
                >
                  <SelectTrigger
                    id="department"
                    className={errors.department ? 'border-rose-500 ring-rose-500' : ''}
                  >
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.department}</p>
                )}
              </div>

              {/* School */}
              <div className="space-y-2">
                <Label htmlFor="school" className="flex items-center gap-1.5">
                  <School className="h-3.5 w-3.5" strokeWidth={1.5} />
                  School / University <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="school"
                  type="text"
                  placeholder="e.g., University of the Philippines"
                  value={form.school}
                  onChange={(e) => updateField('school', e.target.value)}
                  error={!!errors.school}
                />
                {errors.school && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.school}</p>
                )}
              </div>

              {/* Program */}
              <div className="space-y-2">
                <Label htmlFor="program" className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Program / Course <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="program"
                  type="text"
                  placeholder="e.g., BS Computer Science"
                  value={form.program}
                  onChange={(e) => updateField('program', e.target.value)}
                  error={!!errors.program}
                />
                {errors.program && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.program}</p>
                )}
              </div>

              {/* Required Hours */}
              <div className="space-y-2">
                <Label htmlFor="requiredHours" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Required Hours <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="requiredHours"
                  type="number"
                  min={1}
                  max={20000}
                  placeholder="480"
                  value={form.requiredHours}
                  onChange={(e) => updateField('requiredHours', e.target.value)}
                  error={!!errors.requiredHours}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  The total number of hours required for your internship (default: 480).
                </p>
                {errors.requiredHours && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.requiredHours}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-6">
              <Button
                type="submit"
                disabled={initializeMutation.isPending}
                className="min-w-[140px]"
              >
                {initializeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                    Setting up...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Complete Setup
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* Steps indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          <Badge variant="secondary" className="text-xs">
            Step 1 of 1
          </Badge>
          <span>Complete your internship profile to access all features</span>
        </div>
      </div>
    </div>
  );
}
