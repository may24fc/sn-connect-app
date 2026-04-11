'use client';

import { useCreateOnboardingProfile } from '@/hooks/useCreateOnboardingProfile';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { useUpdateOnboardingProfile } from '@/hooks/useUpdateOnboardingProfile';
import {
  normalizePhoneNumber,
  prefixPhoneWithDialCode,
  validatePhoneNumber,
  type SupportedCountryCode,
} from '@/lib/validation/phone';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useToast,
} from '@hr-portal/ui';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StepDocuments } from '@/app/(employee)/onboarding/setup/components/StepDocuments';
import { StepPaymentInfo } from '@/app/(employee)/onboarding/setup/components/StepPaymentInfo';
import { StepPersonalInfo } from '@/app/(employee)/onboarding/setup/components/StepPersonalInfo';
import { StepReview } from '@/app/(employee)/onboarding/setup/components/StepReview';
import type { OnboardingStep } from '@/lib/schemas/onboarding.schema';
import { cn } from '@/lib/utils';

type WizardStep = 'personal_info' | 'payment_info' | 'documents' | 'review';

interface AdminOnboardingWizardProps {
  userRole: 'admin' | 'super_admin';
}

function parsePersonalAddress(rawAddress: string | null): {
  streetAddress: string;
  city: string;
  province: string;
  country: string;
  zipcode: string;
} {
  if (!rawAddress) {
    return { streetAddress: '', city: '', province: '', country: '', zipcode: '' };
  }

  const base = { streetAddress: '', city: '', province: '', country: '', zipcode: '' };
  const segments = rawAddress
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0 || !segments.some((s) => s.includes(':'))) {
    return { ...base, streetAddress: rawAddress };
  }

  for (const segment of segments) {
    const [keyRaw, ...valueParts] = segment.split(':');
    if (!keyRaw) continue;
    const key = keyRaw.trim().toLowerCase();
    const value = valueParts.join(':').trim();
    if (key === 'street') base.streetAddress = value;
    if (key === 'city') base.city = value;
    if (key === 'province') base.province = value;
    if (key === 'country' || key === 'county') base.country = value;
    if (key === 'zipcode') base.zipcode = value;
  }

  return base;
}

// ─── Dynamic Progress Stepper ──────────────────────────────────────────────────

const stepLabels: Record<WizardStep, string> = {
  personal_info: 'Personal Info',
  payment_info: 'Payment Info',
  documents: 'Documents',
  review: 'Review',
};

function AdminProgressStepper({
  steps,
  currentStep,
}: {
  steps: readonly WizardStep[];
  currentStep: WizardStep;
}): ReactNode {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  isCompleted &&
                    'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25',
                  isCurrent &&
                    'border-2 border-zinc-500 bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 shadow-sm shadow-zinc-500/25',
                  !isCompleted &&
                    !isCurrent &&
                    'border-2 border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500',
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'text-sm whitespace-nowrap hidden sm:inline',
                  isCompleted && 'font-medium text-foreground',
                  isCurrent && 'font-semibold text-slate-700 dark:text-zinc-400',
                  !isCompleted && !isCurrent && 'font-medium text-muted-foreground',
                )}
              >
                {stepLabels[step]}
              </span>
            </div>

            {!isLast && (
              <div
                className={cn(
                  'mx-3 h-0.5 w-8 sm:w-12 rounded-full',
                  isCompleted ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Admin Review Step (excludes payment for super_admin) ──────────────────────

function AdminStepReview({
  personalInfo,
  paymentInfo,
  showPayment,
  onEditStep,
}: {
  personalInfo: Record<string, unknown>;
  paymentInfo: Record<string, unknown>;
  showPayment: boolean;
  onEditStep: (step: OnboardingStep) => void;
}): ReactNode {
  if (showPayment) {
    return (
      <StepReview
        personalInfo={personalInfo}
        paymentInfo={paymentInfo}
        onEditStep={onEditStep}
      />
    );
  }

  // Render review without payment section for super_admin
  return (
    <StepReview
      personalInfo={personalInfo}
      paymentInfo={{}}
      onEditStep={onEditStep}
    />
  );
}

// ─── Main Wizard ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'sn-admin-onboarding-wizard-draft';

export function AdminOnboardingWizard({ userRole }: AdminOnboardingWizardProps): ReactNode {
  const router = useRouter();
  const { addToast } = useToast();
  const profileQuery = useOnboardingProfile();
  const createProfile = useCreateOnboardingProfile();
  const updateStep = useUpdateOnboardingProfile();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialSyncDone = useRef(false);
  const submittedRef = useRef(false);

  // Super-admin skips payment_info
  const steps: readonly WizardStep[] = useMemo(() => {
    if (userRole === 'super_admin') {
      return ['personal_info', 'documents', 'review'] as const;
    }
    return ['personal_info', 'payment_info', 'documents', 'review'] as const;
  }, [userRole]);

  const includesPayment = steps.includes('payment_info');

  // ─── Local draft state ─────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<WizardStep>(steps[0] ?? 'personal_info');
  const [personalInfo, setPersonalInfo] = useState<Record<string, unknown>>({});
  const [paymentInfo, setPaymentInfo] = useState<Record<string, unknown>>({});

  // Persist draft to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed.currentStep && steps.includes(parsed.currentStep)) {
        setCurrentStep(parsed.currentStep);
      }
      if (parsed.personalInfo) setPersonalInfo(parsed.personalInfo);
      if (parsed.paymentInfo) setPaymentInfo(parsed.paymentInfo);
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [steps]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ currentStep, personalInfo, paymentInfo })
    );
  }, [currentStep, personalInfo, paymentInfo]);

  const clearDraft = useCallback(() => {
    setCurrentStep(steps[0] ?? 'personal_info');
    setPersonalInfo({});
    setPaymentInfo({});
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [steps]);

  const updatePersonalInfoPartial = useCallback((value: Record<string, unknown>) => {
    setPersonalInfo((prev) => ({ ...prev, ...value }));
  }, []);

  const updatePaymentInfoPartial = useCallback((value: Record<string, unknown>) => {
    setPaymentInfo((prev) => ({ ...prev, ...value }));
  }, []);

  // ─── Sync from server profile (initial load only) ─────────────────────
  useEffect(() => {
    const profile = profileQuery.data?.data;
    if (!profile) return;

    if (profile.is_completed) {
      if (!submittedRef.current) {
        const dashboardPath =
          userRole === 'super_admin' ? '/super-admin/dashboard' : '/admin/dashboard';
        router.replace(dashboardPath);
      }
      return;
    }

    if (!initialSyncDone.current) {
      if (
        profile.current_step &&
        steps.includes(profile.current_step as WizardStep) &&
        profile.current_step !== currentStep
      ) {
        setCurrentStep(profile.current_step as WizardStep);
      }

      updatePersonalInfoPartial({
        ...parsePersonalAddress(profile.address ?? null),
        firstName: profile.first_name ?? '',
        middleName: profile.middle_name ?? '',
        lastName: profile.last_name ?? '',
        position: profile.position ?? '',
        personalEmail: profile.personal_email ?? '',
        emailAddress: profile.email_address ?? '',
        contactNumber: profile.contact_number ?? '',
        contactCountryCode: profile.contact_country_code ?? 'PH',
        birthday: profile.birthday ?? '',
        nationality: profile.nationality ?? '',
        education: profile.education ?? '',
        major: profile.major ?? '',
        emergencyContactName: profile.emergency_contact_name ?? '',
        emergencyContactNumber: profile.emergency_contact_number ?? '',
        emergencyContactCountryCode: profile.emergency_contact_country_code ?? 'PH',
        emergencyContactEmail: profile.emergency_contact_email ?? '',
        emergencyContactRelationship: profile.emergency_contact_relationship ?? '',
      });

      if (includesPayment) {
        updatePaymentInfoPartial({
          paymentCountryCode: profile.payment_country_code ?? 'PH',
          paymentBankId: profile.payment_bank_id ?? '',
          paymentBankName: profile.payment_bank_name ?? '',
          paymentAccountName: profile.payment_account_name ?? '',
          paymentAccountNumber: profile.payment_account_number ?? '',
          paymentEmail: profile.payment_email ?? '',
          paymentPhoneNumber: profile.payment_phone_number ?? '',
          paymentPhoneCountryCode: profile.payment_phone_country_code ?? 'PH',
        });
      }

      initialSyncDone.current = true;
    }
  }, [
    profileQuery.data?.data,
    router,
    userRole,
    steps,
    currentStep,
    includesPayment,
    updatePersonalInfoPartial,
    updatePaymentInfoPartial,
  ]);

  const stepIndex = useMemo(() => steps.indexOf(currentStep), [steps, currentStep]);
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex === steps.length - 1;

  // ─── Persist step to server ────────────────────────────────────────────
  const persistStep = async (step: WizardStep): Promise<void> => {
    if (!profileQuery.data?.data) {
      await createProfile.mutateAsync(personalInfo);
    }

    if (step === 'personal_info') {
      const data = { ...personalInfo };
      data.contactNumber = normalizePhoneNumber(
        String(data.contactNumber ?? ''),
        String(data.contactCountryCode ?? 'PH') as SupportedCountryCode
      );
      data.emergencyContactNumber = normalizePhoneNumber(
        String(data.emergencyContactNumber ?? ''),
        String(data.emergencyContactCountryCode ?? 'PH') as SupportedCountryCode
      );
      await updateStep.mutateAsync({ step, data });
    }

    if (step === 'payment_info') {
      const data = { ...paymentInfo };
      data.paymentPhoneNumber = normalizePhoneNumber(
        String(data.paymentPhoneNumber ?? ''),
        String(data.paymentPhoneCountryCode ?? 'PH') as SupportedCountryCode
      );
      await updateStep.mutateAsync({ step, data });
    }

    if (step === 'documents') {
      await updateStep.mutateAsync({ step, data: {} });
    }

    if (step === 'review') {
      await updateStep.mutateAsync({ step, data: {} });
    }
  };

  // ─── Validate step (documents optional for admins) ─────────────────────
  const validateStep = async (step: WizardStep): Promise<string | null> => {
    if (step === 'personal_info') {
      const requiredFields: Record<string, string> = {
        firstName: 'First name',
        lastName: 'Last name',
        position: 'Position',
        personalEmail: 'Personal email',
        contactNumber: 'Contact number',
        streetAddress: 'Street',
        city: 'City',
        province: 'Province',
        country: 'Country',
        birthday: 'Birthday',
        nationality: 'Nationality',
        education: 'Education',
        emergencyContactName: 'Emergency contact name',
        emergencyContactNumber: 'Emergency contact number',
        emergencyContactRelationship: 'Emergency contact relationship',
      };

      for (const [field, label] of Object.entries(requiredFields)) {
        const value = String(personalInfo[field] ?? '').trim();
        if (!value) return `${label} is required.`;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const personalEmail = String(personalInfo.personalEmail ?? '').trim();
      if (!emailRegex.test(personalEmail)) return 'Please enter a valid personal email address.';

      const emergencyEmail = String(personalInfo.emergencyContactEmail ?? '').trim();
      if (emergencyEmail && !emailRegex.test(emergencyEmail)) {
        return 'Please enter a valid emergency contact email address.';
      }

      const contactNumber = String(personalInfo.contactNumber ?? '').trim();
      const emergencyContactNumber = String(personalInfo.emergencyContactNumber ?? '').trim();

      const fullContact = prefixPhoneWithDialCode(
        contactNumber,
        String(personalInfo.contactCountryCode ?? 'PH') as SupportedCountryCode
      );
      if (
        !validatePhoneNumber(
          fullContact,
          String(personalInfo.contactCountryCode ?? 'PH') as SupportedCountryCode
        )
      ) {
        return 'Please enter a valid contact number.';
      }

      const fullEmergency = prefixPhoneWithDialCode(
        emergencyContactNumber,
        String(personalInfo.emergencyContactCountryCode ?? 'PH') as SupportedCountryCode
      );
      if (
        !validatePhoneNumber(
          fullEmergency,
          String(personalInfo.emergencyContactCountryCode ?? 'PH') as SupportedCountryCode
        )
      ) {
        return 'Please enter a valid emergency contact number.';
      }
    }

    if (step === 'payment_info') {
      const requiredFields: Record<string, string> = {
        paymentAccountName: 'Account name',
        paymentAccountNumber: 'Account number',
        paymentEmail: 'Payment email',
        paymentPhoneNumber: 'Phone number',
      };

      for (const [field, label] of Object.entries(requiredFields)) {
        const value = String(paymentInfo[field] ?? '').trim();
        if (!value) return `${label} is required.`;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const paymentEmail = String(paymentInfo.paymentEmail ?? '').trim();
      if (!emailRegex.test(paymentEmail)) return 'Please enter a valid payment email address.';

      const paymentPhone = prefixPhoneWithDialCode(
        String(paymentInfo.paymentPhoneNumber ?? '').trim(),
        String(paymentInfo.paymentPhoneCountryCode ?? 'PH') as SupportedCountryCode
      );
      if (
        !validatePhoneNumber(
          paymentPhone,
          String(paymentInfo.paymentPhoneCountryCode ?? 'PH') as SupportedCountryCode
        )
      ) {
        return 'Please enter a valid payment phone number.';
      }

      const paymentBankId = String(paymentInfo.paymentBankId ?? '').trim();
      const paymentBankName = String(paymentInfo.paymentBankName ?? '').trim();
      const paymentCountryCode = String(paymentInfo.paymentCountryCode ?? 'PH').trim();
      const paymentCity = String(paymentInfo.paymentCity ?? '').trim();
      if (!paymentBankId) return 'Please select a bank.';
      if (paymentBankId === 'OTHER' && !paymentBankName) {
        return 'Please provide the bank name when selecting Other.';
      }
      if (paymentCountryCode !== 'PH' && !paymentCity) {
        return 'Payment city is required for non-Philippine bank accounts.';
      }
    }

    // Documents are optional for admins/super-admins — no validation

    return null;
  };

  // ─── Navigation handlers ───────────────────────────────────────────────
  const handleBack = (): void => {
    const nextIndex = Math.max(stepIndex - 1, 0);
    const nextStep = steps[nextIndex];
    if (nextStep) setCurrentStep(nextStep);
  };

  const handleNext = async (): Promise<void> => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      const current = steps[stepIndex];
      if (!current) return;

      const validationError = await validateStep(current);
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      await persistStep(current);

      if (isLast) {
        const response = await fetch('/api/onboarding/profile/admin-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: true }),
        });

        if (!response.ok) {
          const payload = await response
            .json()
            .catch(() => ({ error: 'Failed to complete profile setup' }));
          const message = payload.error || 'Failed to complete profile setup';
          addToast({ title: 'Error', description: message, variant: 'error' });
          throw new Error(message);
        }

        addToast({
          title: 'Profile setup complete!',
          description: 'Your information has been saved and your employee record is updated.',
          variant: 'success',
        });

        submittedRef.current = true;
        clearDraft();
        const dashboardPath =
          userRole === 'super_admin' ? '/super-admin/dashboard' : '/admin/dashboard';
        router.push(dashboardPath);
        return;
      }

      const nextStep = steps[stepIndex + 1];
      if (nextStep) {
        setCurrentStep(nextStep);
        addToast({
          title: 'Progress saved',
          description: 'Your information has been saved',
          variant: 'success',
        });
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Unable to continue.';
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) {
          setErrorMessage(parsed.error);
        } else {
          setErrorMessage(raw);
        }
      } catch {
        setErrorMessage(raw);
      }
      addToast({ title: 'Error', description: raw, variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render step ───────────────────────────────────────────────────────
  const renderStep = (): ReactNode => {
    if (currentStep === 'personal_info') {
      return <StepPersonalInfo value={personalInfo} onChange={updatePersonalInfoPartial} />;
    }

    if (currentStep === 'payment_info') {
      return <StepPaymentInfo value={paymentInfo} onChange={updatePaymentInfoPartial} />;
    }

    if (currentStep === 'documents') {
      return (
        <div className="space-y-4">
          <div className="rounded-md border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/30 p-3 text-sm text-sky-700 dark:text-sky-300">
            Document uploads are optional. You can skip this step or upload documents now.
          </div>
          <StepDocuments />
        </div>
      );
    }

    return (
      <AdminStepReview
        personalInfo={personalInfo}
        paymentInfo={paymentInfo}
        showPayment={includesPayment}
        onEditStep={(step) => {
          if (steps.includes(step as WizardStep)) {
            setCurrentStep(step as WizardStep);
          }
        }}
      />
    );
  };

  const dashboardPath =
    userRole === 'super_admin' ? '/super-admin/dashboard' : '/admin/dashboard';

  return (
    <Card className="w-full max-w-5xl">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Fill in your personal details and information. This helps keep employee records
              complete.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => router.push(dashboardPath)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        <AdminProgressStepper steps={steps} currentStep={currentStep} />
      </CardHeader>
      <CardContent className="space-y-6">
        {errorMessage && (
          <div className="rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
        {renderStep()}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <Button variant="outline" onClick={handleBack} disabled={isFirst || submitting}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => {
              void handleNext();
            }}
            disabled={submitting || updateStep.isPending || createProfile.isPending}
          >
            {submitting || updateStep.isPending || createProfile.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isLast ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Complete Setup
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Save & Continue
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
