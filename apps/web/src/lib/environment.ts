export type ControlHubEnvironment = 'local' | 'review' | 'production';

export function getControlHubEnvironment(): ControlHubEnvironment {
  const configured = process.env.CONTROL_HUB_ENV?.trim().toLowerCase();
  if (configured === 'review' || configured === 'production' || configured === 'local') {
    return configured;
  }

  return process.env.NODE_ENV === 'production' ? 'production' : 'local';
}

export function isReviewEnvironment(): boolean {
  return getControlHubEnvironment() === 'review';
}
