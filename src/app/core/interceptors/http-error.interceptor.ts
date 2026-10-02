import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { AppError, AppErrorKind } from '../models/app-error.model';

/**
 * Normalises every failed HTTP call into an `AppError` before it reaches a
 * component, so no component has to branch on raw status codes.
 *
 * Registered after `authInterceptor` (which owns the 401 -> logout redirect),
 * so by the time an error arrives here the auth side effects have already run.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) =>
      throwError(() => toAppError(error, req.url))
    )
  );

function toAppError(error: unknown, url: string): AppError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      kind: 'unknown',
      status: 0,
      message: 'Something went wrong. Please try again.',
      url,
      retryable: true
    };
  }

  const kind = classify(error);
  return {
    kind,
    status: error.status,
    message: DEFAULT_MESSAGES[kind],
    serverMessage: extractServerMessage(error),
    url: error.url ?? url,
    retryable: RETRYABLE.has(kind),
    original: error
  };
}

function classify(error: HttpErrorResponse): AppErrorKind {
  // status 0 means the browser never got a response: offline, DNS failure,
  // CORS rejection, or the API is down.
  if (error.status === 0) {
    return error.error instanceof ProgressEvent && error.error.type === 'timeout'
      ? 'timeout'
      : 'network';
  }

  switch (error.status) {
    case 400:
    case 422:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 408:
      return 'timeout';
    case 409:
      return 'conflict';
    case 413:
      return 'payloadTooLarge';
    case 429:
      return 'rateLimit';
    default:
      break;
  }

  if (error.status >= 500) {
    return 'server';
  }
  if (error.status >= 400) {
    return 'client';
  }
  return 'unknown';
}

/**
 * Pulls a message out of the API body without ever showing it verbatim —
 * backend strings such as "invalid request payload" are not user-facing copy.
 */
function extractServerMessage(error: HttpErrorResponse): string | undefined {
  const body = error.error;
  if (typeof body === 'string' && body.trim() && !body.startsWith('<')) {
    return body.trim();
  }
  if (body && typeof body === 'object') {
    const candidate =
      (body as Record<string, unknown>)['message'] ??
      (body as Record<string, unknown>)['error'];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

const DEFAULT_MESSAGES: Record<AppErrorKind, string> = {
  network:
    'We could not reach the server. Check your internet connection and try again.',
  timeout: 'The server took too long to respond. Please try again.',
  validation: 'Please check the highlighted fields and try again.',
  unauthorized: 'Your session has expired. Please sign in again.',
  forbidden: 'You do not have permission to do that.',
  notFound: 'We could not find what you were looking for.',
  conflict: 'That conflicts with something that already exists.',
  payloadTooLarge: 'That file is too large. Please upload a smaller file.',
  rateLimit: 'Too many attempts. Please wait a minute and try again.',
  client: 'We could not complete that request. Please try again.',
  server:
    'Something went wrong on our side. Please try again in a few minutes.',
  unknown: 'Something went wrong. Please try again.'
};

const RETRYABLE = new Set<AppErrorKind>([
  'network',
  'timeout',
  'server',
  'rateLimit',
  'unknown'
]);
