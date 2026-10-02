import { HttpErrorResponse } from '@angular/common/http';

/**
 * Normalised error shape produced by `httpErrorInterceptor`.
 *
 * Components never inspect raw `HttpErrorResponse` status codes any more; they
 * switch on `kind` and, where a page needs bespoke wording, override
 * `message`. This keeps error copy consistent without making every screen
 * say the same generic sentence.
 */
export type AppErrorKind =
  | 'network' // no response at all (offline, DNS, CORS, server down)
  | 'timeout'
  | 'validation' // 400 / 422 — the submitted data was rejected
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'notFound' // 404
  | 'conflict' // 409
  | 'rateLimit' // 429
  | 'payloadTooLarge' // 413
  | 'client' // any other 4xx
  | 'server' // 5xx
  | 'unknown';

export interface AppError {
  kind: AppErrorKind;
  /** HTTP status, or 0 when the request never reached the server. */
  status: number;
  /** Safe, user-facing default message for this error category. */
  message: string;
  /** Raw message from the API, when it sent one. Not shown verbatim. */
  serverMessage?: string;
  /** Request URL, useful for distinguishing upload vs. submit failures. */
  url?: string;
  /** True when retrying the identical request could plausibly succeed. */
  retryable: boolean;
  /** The original response, kept for logging / edge cases. */
  original?: HttpErrorResponse;
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'retryable' in value &&
    typeof (value as AppError).message === 'string'
  );
}

/**
 * Returns the message to show the user, preferring a caller-supplied override
 * for the specific error kinds a screen wants to word differently.
 */
export function errorMessage(
  error: unknown,
  overrides?: Partial<Record<AppErrorKind, string>>
): string {
  if (!isAppError(error)) {
    return 'Something went wrong. Please try again.';
  }
  return overrides?.[error.kind] ?? error.message;
}
