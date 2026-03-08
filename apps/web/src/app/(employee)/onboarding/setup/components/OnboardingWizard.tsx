'use client';

import { useCreateOnboardingProfile } from '@/hooks/useCreateOnboardingProfile';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { useOnboardingWizard } from '@/hooks/useOnboardingWizard';
import { useUpdateOnboardingProfile } from '@/hooks/useUpdateOnboardingProfile';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useToast,
} from '@hr-portal/ui';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
  const { addToast } = useToast();
  const profileQuery = useOnboardingProfile();
  const createProfile = useCreateOnboardingProfile();
  const updateStep = useUpdateOnboardingProfile();
  const { draft, setStep, updatePersonalInfo, updatePaymentInfo, clearDraft } =
    useOnboardingWizard();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialSyncDone = useRef(false);

  useEffect(() => {
    const profile = profileQuery.data?.data;
    if (!profile) return;

    if (profile.is_completed) {
      router.replace('/dashboard');
      return;
    }

    // Only sync step from server on initial load to avoid race conditions
    if (
      !initialSyncDone.current &&
      profile.current_step &&
      profile.current_step !== draft.currentStep
    ) {
      setStep(profile.current_step);
    }

    updatePersonalInfo({
      firstName: profile.first_name ?? '',
      middleName: profile.middle_name ?? '',
      lastName: profile.last_name ?? '',
      position: profile.position ?? '',
      personalEmail: profile.personal_email ?? '',
      companyEmail: profile.company_email ?? '',
      emailAddress: profile.email_address ?? '',
      contactNumber: profile.contact_number ?? '',
      address: profile.address ?? '',
      birthday: profile.birthday ?? '',
      nationality: profile.nationality ?? '',
      education: profile.education ?? '',
      major: profile.major ?? '',
      emergencyContactName: profile.emergency_contact_name ?? '',
      emergencyContactNumber: profile.emergency_contact_number ?? '',
      emergencyContactEmail: profile.emergency_contact_email ?? '',
      emergencyContactRelationship: profile.emergency_contact_relationship ?? '',
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

    initialSyncDone.current = true;
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

  const validateStep = async (step: Step): Promise<string | null> => {
    if (step === 'personal_info') {
      const requiredFields = {
        firstName: 'First name',
        lastName: 'Last name',
        position: 'Position',
        personalEmail: 'Personal email',
        companyEmail: 'Company email',
        contactNumber: 'Contact number',
        address: 'Address',
        birthday: 'Birthday',
        nationality: 'Nationality',
        education: 'Education',
        emergencyContactName: 'Emergency contact name',
        emergencyContactNumber: 'Emergency contact number',
        emergencyContactRelationship: 'Emergency contact relationship',
      };

      for (const [field, label] of Object.entries(requiredFields)) {
        const value = String(draft.personalInfo[field] ?? '').trim();
        if (!value) {
          return `${label} is required.`;
        }
      }

      // Email validation (required emails)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const personalEmail = String(draft.personalInfo.personalEmail ?? '').trim();
      const companyEmail = String(draft.personalInfo.companyEmail ?? '').trim();

      if (!emailRegex.test(personalEmail)) {
        return 'Please enter a valid personal email address.';
      }
      if (!emailRegex.test(companyEmail)) {
        return 'Please enter a valid company email address.';
      }

      // Optional email validation - only validate if provided
      const emergencyEmail = String(draft.personalInfo.emergencyContactEmail ?? '').trim();
      if (emergencyEmail && !emailRegex.test(emergencyEmail)) {
        return 'Please enter a valid emergency contact email address.';
      }

      // Phone number validation
      const phoneRegex = /^(\+63|0)?9\d{9}$/;
      const contactNumber = String(draft.personalInfo.contactNumber ?? '').trim();
      const emergencyContactNumber = String(draft.personalInfo.emergencyContactNumber ?? '').trim();

      if (!phoneRegex.test(contactNumber)) {
        return 'Please enter a valid contact number (09XXXXXXXXX or +639XXXXXXXXX).';
      }
      if (!phoneRegex.test(emergencyContactNumber)) {
        return 'Please enter a valid emergency contact number (09XXXXXXXXX or +639XXXXXXXXX).';
      }
    }

    if (step === 'payment_info') {
      const requiredFields = {
        paymentAccountName: 'Account name',
        paymentAccountNumber: 'Account number',
        paymentEmail: 'Payment email',
        paymentPhoneNumber: 'Phone number',
        paymentAddress: 'Address',
        paymentCity: 'City',
        paymentProvince: 'Province',
      };

      for (const [field, label] of Object.entries(requiredFields)) {
        const value = String(draft.paymentInfo[field] ?? '').trim();
        if (!value) {
          return `${label} is required.`;
        }
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const paymentEmail = String(draft.paymentInfo.paymentEmail ?? '').trim();
      if (!emailRegex.test(paymentEmail)) {
        return 'Please enter a valid payment email address.';
      }
    }

    if (step === 'documents') {
      // Check if documents have been uploaded
      try {
        const response = await fetch('/api/onboarding/documents');
        if (!response.ok) {
          return 'Failed to verify documents. Please try again.';
        }
        const result = await response.json();
        const documents = result.data ?? [];

        if (documents.length === 0) {
          return 'Please upload at least one required document before proceeding.';
        }
      } catch (error) {
        console.error('Failed to check documents:', error);
        return 'Failed to verify documents. Please try again.';
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

      const validationError = await validateStep(current);
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
          const message = payload.error || 'Failed to complete onboarding';
          addToast({
            title: 'Error',
            description: message,
            variant: 'error',
          });
          throw new Error(message);
        }

        addToast({
          title: 'Onboarding completed!',
          description: 'Your submission is awaiting approval',
          variant: 'success',
        });

        clearDraft();
        router.push('/onboarding/awaiting-approval');
        return;
      }

      const nextStep = steps[stepIndex + 1];
      if (nextStep) {
        setStep(nextStep);
        addToast({
          title: 'Progress saved',
          description: 'Your information has been saved',
          variant: 'success',
        });
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Unable to continue onboarding.';
      // Attempt to parse stringified JSON that may have leaked from an older code-path
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
      addToast({
        title: 'Error',
        description: raw,
        variant: 'error',
      });
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

  // Onboarding is mandatory when the profile is not completed.
  // Hide the Exit button in that case so users cannot bypass the flow.
  const isMandatory = !profileQuery.data?.data?.is_completed;

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
          {!isMandatory && (
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Exit
            </Button>
          )}
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
