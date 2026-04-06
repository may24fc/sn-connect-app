// ──────────────────────────────────────────────────────────────
// Error Code Registry — V3-0.1
// Structured error codes for API responses and client display
// ──────────────────────────────────────────────────────────────

export const ErrorCode = {
  // Authentication
  AUTH_REQUIRED: 'E001-AUTH',
  AUTH_INVALID_TOKEN: 'E001-AUTH-TOKEN',
  AUTH_SESSION_EXPIRED: 'E001-AUTH-EXPIRED',

  // Validation
  VALIDATION_FAILED: 'E002-VALIDATION',
  VALIDATION_MISSING_FIELD: 'E002-VALIDATION-FIELD',
  VALIDATION_INVALID_FORMAT: 'E002-VALIDATION-FORMAT',

  // Network / External
  NETWORK_ERROR: 'E003-NETWORK',
  NETWORK_TIMEOUT: 'E003-NETWORK-TIMEOUT',
  SERVICE_UNAVAILABLE: 'E003-SERVICE',

  // Database
  DB_ERROR: 'E004-DB',
  DB_NOT_FOUND: 'E004-DB-NOTFOUND',
  DB_CONFLICT: 'E004-DB-CONFLICT',

  // Permission
  PERMISSION_DENIED: 'E005-PERMISSION',
  PERMISSION_ROLE: 'E005-PERMISSION-ROLE',

  // General
  INTERNAL_ERROR: 'E099-INTERNAL',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  success: false;
  error: {
    code: ErrorCodeValue;
    message: string;
    action: string;
  };
}

/**
 * Build a structured error JSON response for API routes.
 * Logs full error server-side, returns user-friendly message to client.
 */
export function apiError(
  code: ErrorCodeValue,
  message: string,
  status: number,
  options?: { action?: string; cause?: unknown }
): Response {
  if (options?.cause) {
    console.error(`[${code}] ${message}`, options.cause);
  }

  const body: ApiErrorBody = {
    success: false,
    error: {
      code,
      message,
      action: options?.action ?? getDefaultAction(code),
    },
  };

  return Response.json(body, { status });
}

function getDefaultAction(code: ErrorCodeValue): string {
  if (code.startsWith('E001')) return 'Please sign in again.';
  if (code.startsWith('E002')) return 'Check your input and try again.';
  if (code.startsWith('E003')) return 'Check your connection and try again.';
  if (code.startsWith('E004-DB-NOTFOUND')) return 'The requested resource was not found.';
  if (code.startsWith('E004')) return 'Please try again. If this persists, contact support.';
  if (code.startsWith('E005')) return 'You do not have permission for this action.';
  return 'Please try again. If this persists, contact support.';
}

/**
 * Normalise raw Supabase / browser network error messages into friendly text.
 * Call this before surfacing any auth error to the user.
 */
export function normalizeAuthError(message: string): string {
  const lower = message.toLowerCase();

  // Network / offline errors emitted by different browsers
  if (
    lower === 'failed to fetch' ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('the internet connection appears to be offline') ||
    lower.includes('load failed') ||
    lower.includes('the network connection was lost')
  ) {
    return 'Unable to reach the authentication service. Check your connection or local Supabase services and try again.';
  }

  // Supabase timeout (our own withTimeout message)
  if (lower.includes('timed out')) {
    return 'The request timed out. Please check your connection and try again.';
  }

  return message;
}

/**
 * User-facing error messages keyed by error code prefix.
 * Used by the ErrorBoundary and client-side error display.
 */
export function getUserMessage(code: string): string {
  if (code.startsWith('E001')) return 'Your session has expired. Please sign in again.';
  if (code.startsWith('E002')) return 'Some information is missing or invalid.';
  if (code.startsWith('E003')) return 'We could not reach the server. Check your connection.';
  if (code.startsWith('E004-DB-NOTFOUND')) return 'The item you are looking for does not exist.';
  if (code.startsWith('E004')) return 'A database error occurred. Please try again.';
  if (code.startsWith('E005')) return 'You do not have permission to perform this action.';
  return 'An unexpected error occurred. Please try again.';
}
