const ONBOARDING_STEP_LABELS = {
  personal_info: 'Personal Information',
  payment_info: 'Payment Information',
  documents: 'Documents',
  review: 'Review',
} as const;

export function getOnboardingStepLabel(step: string | null | undefined): string {
  if (!step) {
    return '—';
  }

  return (
    ONBOARDING_STEP_LABELS[step as keyof typeof ONBOARDING_STEP_LABELS] ??
    step
      .split('_')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
      .join(' ')
  );
}