export function getTaskDetailPath(
  taskId: string,
  detailPrefix: string,
  returnTo = detailPrefix
): string {
  return `${detailPrefix}/${taskId}?returnTo=${encodeURIComponent(returnTo)}`;
}
