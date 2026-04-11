export type OnboardingReviewState =
  | 'in_progress'
  | 'awaiting_review'
  | 'rejected'
  | 'approved';

export function getOnboardingReviewStateLabel(state: OnboardingReviewState): string {
  switch (state) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'awaiting_review':
      return 'Awaiting Review';
    case 'in_progress':
    default:
      return 'In Progress';
  }
}

export function getOnboardingReviewStateBadgeVariant(
  state: OnboardingReviewState
): 'approved' | 'rejected' | 'pending' | 'warning' {
  switch (state) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'awaiting_review':
      return 'pending';
    case 'in_progress':
    default:
      return 'warning';
  }
}
