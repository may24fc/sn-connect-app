'use client';

import { useCreateOnboardingProfile } from '@/hooks/useCreateOnboardingProfile';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { useOnboardingWizard } from '@/hooks/useOnboardingWizard';
import { useUpdateOnboardingProfile } from '@/hooks/useUpdateOnboardingProfile';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hr-portal/ui';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { NavigationControls } from './NavigationControls';
import { ProgressStepper } from './ProgressStepper';
import { StepDocuments } from './StepDocuments';
import { StepPaymentInfo } from './StepPaymentInfo';
import { StepPersonalInfo } from './StepPersonalInfo';
import { StepReview } from './StepReview';

const steps = ['personal_info', 'payment_info', 'documents', 'review'] as const;

type Step = (typeof steps)[number];

export function OnboardingWizard(): ReactNode {
  const router = useRouter();
  const profileQuery = useOnboardingProfile();
  const createProfile = useCreateOnboardingProfile();
  const updateStep = useUpdateOnboardingProfile();
  const { draft, setStep, updatePersonalInfo, updatePaymentInfo, clearDraft } =
    useOnboardingWizard();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const profile = profileQuery.data?.data;
    if (!profile) return;

    if (profile.is_completed) {
      router.replace('/dashboard');
      return;
    }

    if (profile.current_step && profile.current_step !== draft.currentStep) {
      setStep(profile.current_step);
    }

    updatePersonalInfo({
      firstName: profile.first_name ?? '',
      middleName: profile.middle_name ?? '',
      lastName: profile.last_name ?? '',
      position: profile.position ?? '',
      emailAddress: profile.email_address ?? '',
      contactNumber: profile.contact_number ?? '',
      address: profile.address ?? '',
    });

    updatePaymentInfo({
      paymentAccountName: profile.payment_account_name ?? '',
      paymentAccountNumber: profile.payment_account_number ?? '',
      paymentEmail: profile.payment_email ?? '',
      paymentPhoneNumber: profile.payment_phone_number ?? '',
      paymentAddress: profile.payment_address ?? '',
      paymentCity: profile.payment_city ?? '',
      paymentProvince: profile.payment_province ?? '',
      paymentZipcode: profile.payment_zipcode ?? '',
    });
  }, [
    draft.currentStep,
    profileQuery.data?.data,
    router,
    setStep,
    updatePaymentInfo,
    updatePersonalInfo,
  ]);

  const stepIndex = useMemo(() => steps.indexOf(draft.currentStep as Step), [draft.currentStep]);
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex === steps.length - 1;

  const persistStep = async (step: Step): Promise<void> => {
    if (!profileQuery.data?.data) {
      await createProfile.mutateAsync(draft.personalInfo);
    }

    if (step === 'personal_info') {
      await updateStep.mutateAsync({ step, data: draft.personalInfo });
    }

    if (step === 'payment_info') {
      await updateStep.mutateAsync({ step, data: draft.paymentInfo });
    }

    if (step === 'documents') {
      await updateStep.mutateAsync({ step, data: {} });
    }

    if (step === 'review') {
      await updateStep.mutateAsync({ step, data: {} });
    }
  };

  const validateStep = (step: Step): string | null => {
    if (step === 'personal_info') {
      const firstName = String(draft.personalInfo.firstName ?? '').trim();
      const lastName = String(draft.personalInfo.lastName ?? '').trim();
      const position = String(draft.personalInfo.position ?? '').trim();

      if (!(firstName && lastName && position)) {
        return 'First name, last name, and position are required.';
      }
    }

    if (step === 'payment_info') {
      const accountName = String(draft.paymentInfo.paymentAccountName ?? '').trim();
      const accountNumber = String(draft.paymentInfo.paymentAccountNumber ?? '').trim();

      if (!(accountName && accountNumber)) {
        return 'Payment account name and account number are required.';
      }
    }

    return null;
  };

  const handleBack = (): void => {
    const nextIndex = Math.max(stepIndex - 1, 0);
    const nextStep = steps[nextIndex];
    if (nextStep) {
      setStep(nextStep);
    }
  };

  const handleNext = async (): Promise<void> => {
    try {
      setSubmitting(true);
      setErrorMessage(null);
      const current = steps[stepIndex];
      if (!current) {
        return;
      }

      const validationError = validateStep(current);
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      await persistStep(current);

      if (isLast) {
        const response = await fetch('/api/onboarding/profile/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: true }),
        });

        if (!response.ok) {
          const payload = await response
            .json()
            .catch(() => ({ error: 'Failed to complete onboarding' }));
          throw new Error(payload.error || 'Failed to complete onboarding');
        }

        clearDraft();
        router.push('/onboarding/complete');
        return;
      }

      const nextStep = steps[stepIndex + 1];
      if (nextStep) {
        setStep(nextStep);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to continue onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = (): ReactNode => {
    if (draft.currentStep === 'personal_info') {
      return <StepPersonalInfo value={draft.personalInfo} onChange={updatePersonalInfo} />;
    }

    if (draft.currentStep === 'payment_info') {
      return <StepPaymentInfo value={draft.paymentInfo} onChange={updatePaymentInfo} />;
    }

    if (draft.currentStep === 'documents') {
      return <StepDocuments />;
    }

    return <StepReview personalInfo={draft.personalInfo} paymentInfo={draft.paymentInfo} />;
  };

  return (
    <Card className="w-full max-w-5xl">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Complete Your Onboarding Setup</CardTitle>
            <CardDescription>
              Fill out all required onboarding data. You can continue where you left off.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Exit
          </Button>
        </div>
        <ProgressStepper currentStep={draft.currentStep as Step} />
      </CardHeader>
      <CardContent className="space-y-6">
        {errorMessage && (
          <div className="rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3 text-sm text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        )}
        {renderStep()}
        <NavigationControls
          isFirst={isFirst}
          isLast={isLast}
          isSaving={submitting || updateStep.isPending || createProfile.isPending}
          onBack={handleBack}
          onNext={() => {
            void handleNext();
          }}
        />
      </CardContent>
    </Card>
  );
}
