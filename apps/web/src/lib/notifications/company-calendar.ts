export function getNotificationCalendarAddUrl(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const value = metadata?.calendarAddUrl;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function getNotificationCalendarSourceUrl(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const value = metadata?.calendarSourceUrl;
  return typeof value === 'string' && value.length > 0 ? value : null;
}