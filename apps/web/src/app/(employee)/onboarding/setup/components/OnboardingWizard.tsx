'use client';

import { useCreateOnboardingProfile } from '@/hooks/useCreateOnboardingProfile';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { useOnboardingWizard } from '@/hooks/useOnboardingWizard';
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
import { LogOut, SkipForward } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { NavigationControls } from './NavigationControls';
import { ProgressStepper } from './ProgressStepper';
import { StepDocuments } from './StepDocuments';
import { StepPaymentInfo } from './StepPaymentInfo';
import { StepPersonalInfo } from './StepPersonalInfo';
import { StepReview } from './StepReview';

const steps = ['personal_info', 'payment_info', 'documents', 'review'] as const;
const requiredDocumentTypes = ['cv', 'profile_photo'] as const;
const requiredDocumentLabels: Record<(typeof requiredDocumentTypes)[number], string> = {
  cv: 'CV',
  profile_photo: 'Profile Photo',
};

type Step = (typeof steps)[number];

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
  const segments = rawAddress.split('|').map((segment) => segment.trim()).filter(Boolean);

  if (segments.length === 0 || !segments.some((segment) => segment.includes(':'))) {
    return { ...base, streetAddress: rawAddress };
  }

  for (const segment of segments) {
    const [keyRaw, ...valueParts] = segment.split(':');
    if (!keyRaw) {
      continue;
    }
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
  // Prevents the is_completed guard from overriding the post-submit navigation
  // to /onboarding/awaiting-approval when the profile query refetches after the
  // complete endpoint marks is_completed = true.
  const submittedRef = useRef(false);

  useEffect(() => {
    const profile = profileQuery.data?.data;
    if (!profile) return;

    if (profile.is_completed) {
      if (!submittedRef.current) {
        router.replace('/dashboard');
      }
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

    updatePaymentInfo({
      paymentCountryCode: profile.payment_country_code ?? 'PH',
      paymentBankId: profile.payment_bank_id ?? '',
      paymentBankName: profile.payment_bank_name ?? '',
      paymentAccountName: profile.payment_account_name ?? '',
      paymentAccountNumber: profile.payment_account_number ?? '',
      paymentEmail: profile.payment_email ?? '',
      paymentPhoneNumber: profile.payment_phone_number ?? '',
      paymentPhoneCountryCode: profile.payment_phone_country_code ?? 'PH',
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
      const data = { ...draft.personalInfo };
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
      const data = { ...draft.paymentInfo };
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

  const validateStep = async (step: Step): Promise<string | null> => {
    if (step === 'personal_info') {
      const requiredFields = {
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
        const value = String(draft.personalInfo[field] ?? '').trim();
        if (!value) {
          return `${label} is required.`;
        }
      }

      // Email validation (required emails)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const personalEmail = String(draft.personalInfo.personalEmail ?? '').trim();

      if (!emailRegex.test(personalEmail)) {
        return 'Please enter a valid personal email address.';
      }

      // Optional email validation - only validate if provided
      const emergencyEmail = String(draft.personalInfo.emergencyContactEmail ?? '').trim();
      if (emergencyEmail && !emailRegex.test(emergencyEmail)) {
        return 'Please enter a valid emergency contact email address.';
      }

      // Phone number validation – build full international number before checking
      const contactNumber = String(draft.personalInfo.contactNumber ?? '').trim();
      const emergencyContactNumber = String(draft.personalInfo.emergencyContactNumber ?? '').trim();

      const fullContact = prefixPhoneWithDialCode(
        contactNumber,
        String(draft.personalInfo.contactCountryCode ?? 'PH') as SupportedCountryCode
      );
      if (
        !validatePhoneNumber(
          fullContact,
          String(draft.personalInfo.contactCountryCode ?? 'PH') as SupportedCountryCode
        )
      ) {
        return 'Please enter a valid contact number.';
      }

      const fullEmergency = prefixPhoneWithDialCode(
        emergencyContactNumber,
        String(draft.personalInfo.emergencyContactCountryCode ?? 'PH') as SupportedCountryCode
      );
      if (
        !validatePhoneNumber(
          fullEmergency,
          String(draft.personalInfo.emergencyContactCountryCode ?? 'PH') as SupportedCountryCode
        )
      ) {
        return 'Please enter a valid emergency contact number.';
      }
    }

    if (step === 'payment_info') {
      const requiredFields = {
        paymentAccountName: 'Account name',
        paymentAccountNumber: 'Account number',
        paymentEmail: 'Payment email',
        paymentPhoneNumber: 'Phone number',
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

      const paymentPhone = prefixPhoneWithDialCode(
        String(draft.paymentInfo.paymentPhoneNumber ?? '').trim(),
        String(draft.paymentInfo.paymentPhoneCountryCode ?? 'PH') as SupportedCountryCode
      );
      if (
        !validatePhoneNumber(
          paymentPhone,
          String(draft.paymentInfo.paymentPhoneCountryCode ?? 'PH') as SupportedCountryCode
        )
      ) {
        return 'Please enter a valid payment phone number.';
      }

      const paymentBankId = String(draft.paymentInfo.paymentBankId ?? '').trim();
      const paymentBankName = String(draft.paymentInfo.paymentBankName ?? '').trim();
      if (!paymentBankId) {
        return 'Please select a bank.';
      }
      if (paymentBankId === 'OTHER' && !paymentBankName) {
        return 'Please provide the bank name when selecting Other.';
      }
    }

    if (step === 'documents') {
      // Check if all required documents have been uploaded
      try {
        const response = await fetch('/api/onboarding/documents');
        if (!response.ok) {
          return 'Failed to verify documents. Please try again.';
        }
        const result = await response.json();
        const documents = result.data ?? [];
        const uploadedTypes = new Set(
          documents
            .map((doc: { document_type?: string }) => String(doc.document_type ?? ''))
            .filter(Boolean)
        );

        const missingTypes = requiredDocumentTypes.filter((type) => !uploadedTypes.has(type));
        if (missingTypes.length > 0) {
          const missingLabels = missingTypes.map((type) => requiredDocumentLabels[type]).join(', ');
          return `Please upload all required documents before proceeding. Missing: ${missingLabels}.`;
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

        submittedRef.current = true;
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

    return (
      <StepReview
        personalInfo={draft.personalInfo}
        paymentInfo={draft.paymentInfo}
        onEditStep={setStep}
      />
    );
  };

  // Onboarding can be skipped — users will see a reminder on their dashboard.
  const isCompleted = profileQuery.data?.data?.is_completed === true;

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
          {isCompleted ? (
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <LogOut className="h-4 w-4" />
              Exit
            </Button>
          ) : (
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <SkipForward className="h-4 w-4" />
              Skip for now
            </Button>
          )}
        </div>
        <ProgressStepper currentStep={draft.currentStep as Step} />
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
