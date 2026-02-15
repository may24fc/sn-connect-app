import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useOnboardingWizard } from '../../apps/web/src/hooks/useOnboardingWizard';

describe('useOnboardingWizard', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('initializes with default step', () => {
    const { result } = renderHook(() => useOnboardingWizard());
    expect(result.current.draft.currentStep).toBe('personal_info');
  });

  it('updates and persists personal info draft', () => {
    const { result } = renderHook(() => useOnboardingWizard());

    act(() => {
      result.current.updatePersonalInfo({ firstName: 'John' });
    });

    expect(result.current.draft.personalInfo.firstName).toBe('John');
    expect(window.sessionStorage.getItem('sn-onboarding-wizard-draft')).toContain('John');
  });

  it('can clear draft from state and session storage', () => {
    const { result } = renderHook(() => useOnboardingWizard());

    act(() => {
      result.current.updatePaymentInfo({ paymentAccountName: 'Jane Doe' });
      result.current.clearDraft();
    });

    expect(result.current.draft.currentStep).toBe('personal_info');
    expect(window.sessionStorage.getItem('sn-onboarding-wizard-draft')).toBeNull();
  });
});
