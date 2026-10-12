import { createHmac } from 'node:crypto';

/** Stable, non-reversible UUID for per-email audit rate limits. */
export function passwordResetAuditRecordId(email: string, secret: string): string {
  const hex = createHmac('sha256', secret).update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
