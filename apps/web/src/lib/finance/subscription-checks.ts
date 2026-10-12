export type SubscriptionCheckRow = {
  id: string;
  vendor_name: string;
  active: boolean;
  next_renewal: string | null;
  last_charged: string | null;
};

export function subscriptionChecks<T extends SubscriptionCheckRow>(
  subscription: T,
  all: Array<T>,
  today: string
): Array<string> {
  if (!subscription.active) return [];
  const checks: Array<string> = [];
  const vendor = subscription.vendor_name.trim().toLocaleLowerCase();
  if (
    all.some(
      (other) =>
        other.active &&
        other.id !== subscription.id &&
        other.vendor_name.trim().toLocaleLowerCase() === vendor
    )
  ) {
    checks.push('Same vendor appears in another active subscription');
  }
  if (
    subscription.next_renewal &&
    subscription.next_renewal < today &&
    (!subscription.last_charged || subscription.last_charged < subscription.next_renewal)
  ) {
    checks.push('Renewal date passed; review linked charge');
  }
  return checks;
}
