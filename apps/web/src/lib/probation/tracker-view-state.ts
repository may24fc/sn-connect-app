export type ProbationTrackerViewState = 'loading' | 'error' | 'empty' | 'ready';

/** Which probation tracker panel to show; errors win over loading so failures are never hidden. */
export function getProbationTrackerViewState({
  isLoading,
  hasError,
  employeeCount,
}: {
  isLoading: boolean;
  hasError: boolean;
  employeeCount: number;
}): ProbationTrackerViewState {
  if (hasError) {
    return 'error';
  }

  if (isLoading) {
    return 'loading';
  }

  if (employeeCount === 0) {
    return 'empty';
  }

  return 'ready';
}
