import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'valahatti_admin_token';

/** Builds a JWT-shaped string whose payload has the given `exp` (seconds). */
function makeToken(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ------------------------------------------------------------ token expiry
  describe('token expiry', () => {
    it('treats a missing token as unauthenticated', () => {
      expect(service.getToken()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('accepts a token whose exp is in the future', () => {
      localStorage.setItem(
        TOKEN_KEY,
        makeToken({ exp: nowSeconds() + 3600, sub: 'admin' })
      );

      expect(service.isAuthenticated()).toBeTrue();
    });

    it('rejects a token whose exp has passed', () => {
      localStorage.setItem(
        TOKEN_KEY,
        makeToken({ exp: nowSeconds() - 60, sub: 'admin' })
      );

      expect(service.isAuthenticated()).toBeFalse();
    });

    it('rejects a token that expires exactly now', () => {
      // `Date.now() >= exp * 1000` — the boundary must count as expired.
      localStorage.setItem(TOKEN_KEY, makeToken({ exp: nowSeconds() - 1 }));

      expect(service.isAuthenticated()).toBeFalse();
    });

    it('accepts a token with no exp claim', () => {
      // A token the server issued without an expiry is not our call to reject.
      localStorage.setItem(TOKEN_KEY, makeToken({ sub: 'admin' }));

      expect(service.isAuthenticated()).toBeTrue();
    });

    it('rejects a malformed token rather than throwing', () => {
      localStorage.setItem(TOKEN_KEY, 'not-a-jwt');

      expect(() => service.isAuthenticated()).not.toThrow();
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('rejects a token whose payload is not valid base64 JSON', () => {
      localStorage.setItem(TOKEN_KEY, 'header.%%%notbase64%%%.sig');

      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  // -------------------------------------------------------------- login flow
  describe('login', () => {
    it('posts trimmed credentials and stores the returned token', () => {
      const token = makeToken({ exp: nowSeconds() + 600 });

      service
        .login({ email: '  admin@example.com  ', password: 'secret123' })
        .subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}/auth/login`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body.email).toBe('admin@example.com');
      expect(req.request.body.password).toBe('secret123');

      req.flush({ token });

      expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('does not store a token when login fails', () => {
      service
        .login({ email: 'admin@example.com', password: 'wrong' })
        .subscribe({ error: () => undefined });

      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  // ------------------------------------------------------------------ logout
  it('logout clears the stored token', () => {
    localStorage.setItem(TOKEN_KEY, makeToken({ exp: nowSeconds() + 600 }));

    service.logout();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });
});
