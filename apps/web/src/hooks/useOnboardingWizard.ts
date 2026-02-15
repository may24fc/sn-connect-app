import type { OnboardingStep } from '@/lib/schemas/onboarding.schema';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sn-onboarding-wizard-draft';

export interface OnboardingWizardDraft {
  currentStep: OnboardingStep;
  personalInfo: Record<string, unknown>;
  paymentInfo: Record<string, unknown>;
}

const defaultDraft: OnboardingWizardDraft = {
  currentStep: 'personal_info',
  personalInfo: {},
  paymentInfo: {},
};

export function useOnboardingWizard() {
  const [draft, setDraft] = useState<OnboardingWizardDraft>(defaultDraft);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as OnboardingWizardDraft;
      setDraft(parsed);
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const setStep = useCallback((step: OnboardingStep) => {
    setDraft((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const updatePersonalInfo = useCallback((value: Record<string, unknown>) => {
    setDraft((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, ...value } }));
  }, []);

  const updatePaymentInfo = useCallback((value: Record<string, unknown>) => {
    setDraft((prev) => ({ ...prev, paymentInfo: { ...prev.paymentInfo, ...value } }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraft(defaultDraft);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const steps = useMemo(
    () => ['personal_info', 'payment_info', 'documents', 'review'] as const,
    []
  );

  return {
    draft,
    steps,
    setStep,
    updatePersonalInfo,
    updatePaymentInfo,
    clearDraft,
  };
}
