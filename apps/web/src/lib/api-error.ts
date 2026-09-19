/**
 * Error thrown by data hooks when an API route responds with a non-2xx status.
 *
 * Carrying the status lets route-level screens distinguish "not found",
 * "forbidden" and "server failed" instead of collapsing every failure into a
 * generic error — or, worse, into a permanent loading state.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Builds an {@link ApiError} from a failed `fetch` response, preferring the
 * `error` field that this codebase's API routes return.
 */
export async function toApiError(response: Response, fallbackMessage: string): Promise<ApiError> {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    details?: unknown;
  } | null;

  return new ApiError(payload?.error || fallbackMessage, response.status, payload?.details);
}

/** Throws an {@link ApiError} when the response is not ok; otherwise returns it. */
export async function ensureOk(response: Response, fallbackMessage: string): Promise<Response> {
  if (!response.ok) {
    throw await toApiError(response, fallbackMessage);
  }
  return response;
}

export function getApiErrorStatus(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}

export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
