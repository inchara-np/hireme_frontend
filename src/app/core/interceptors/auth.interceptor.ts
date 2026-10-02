import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/** Endpoints that require the admin bearer token. */
const PROTECTED_PATH = '/admin/';

/**
 * Attaches the admin bearer token to protected requests and owns the
 * "token rejected -> sign out" side effect.
 *
 * Note: both `inject()` calls happen in the interceptor body, not inside the
 * `catchError` callback. Injecting from inside the callback runs outside
 * Angular's injection context and throws NG0203 at the exact moment the app is
 * already handling an auth failure.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isProtected = req.url.includes(PROTECTED_PATH);
  const token = authService.getToken();

  const authReq =
    isProtected && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error?.status === 401 && isProtected) {
        authService.logout();
        void router.navigate(['/admin/login']);
      }
      return throwError(() => error);
    })
  );
};
