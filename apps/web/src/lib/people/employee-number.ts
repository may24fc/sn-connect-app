/** Human-readable employee number, e.g. `EMP-20261007-4821`. Uniqueness is enforced by the DB. */
export function generateEmployeeNumber(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `EMP-${yyyy}${mm}${dd}-${random}`;
}
