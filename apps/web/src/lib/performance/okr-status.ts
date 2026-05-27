import type { OKRStatus } from '@hr-portal/ui';

export function getDisplayOKRStatus(status: OKRStatus, progressPercentage: number): OKRStatus {
  if (progressPercentage >= 100) {
    return 'completed';
  }

  if (status === 'completed') {
    return 'in_progress';
  }

  return status;
}