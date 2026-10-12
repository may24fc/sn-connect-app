/** Parse a bounded, positive page and page size from a GET query. */
export function parsePagination(
  searchParams: URLSearchParams,
  defaultPageSize: number,
  maxPageSize = 100
): { page: number; pageSize: number } | null {
  const rawPage = searchParams.get('page') ?? '1';
  const rawPageSize = searchParams.get('pageSize') ?? String(defaultPageSize);
  if (!/^\d+$/.test(rawPage) || !/^\d+$/.test(rawPageSize)) return null;

  const page = Number(rawPage);
  const pageSize = Number(rawPageSize);
  if (
    !Number.isSafeInteger(page) ||
    !Number.isSafeInteger(pageSize) ||
    page < 1 ||
    pageSize < 1 ||
    pageSize > maxPageSize ||
    !Number.isSafeInteger((page - 1) * pageSize)
  ) {
    return null;
  }

  return { page, pageSize };
}
