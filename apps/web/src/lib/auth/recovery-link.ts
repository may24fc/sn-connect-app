export function normaliseRecoveryActionLink(actionLink: string, redirectTo: string): string {
  try {
    const actionUrl = new URL(actionLink);
    const currentRedirectTarget = actionUrl.searchParams.get('redirect_to');

    if (currentRedirectTarget !== redirectTo) {
      actionUrl.searchParams.set('redirect_to', redirectTo);
    }

    return actionUrl.toString();
  } catch {
    return actionLink;
  }
}