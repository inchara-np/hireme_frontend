import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter
} from '@angular/router';

import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

class FakeAuthService {
  authenticated = false;
  isAuthenticated(): boolean {
    return this.authenticated;
  }
}

/** Guards are functions; they must be invoked inside an injection context. */
function runGuard(guard: typeof authGuard): boolean | UrlTree {
  return TestBed.runInInjectionContext(
    () =>
      guard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      ) as boolean | UrlTree
  );
}

describe('route guards', () => {
  let auth: FakeAuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useClass: FakeAuthService }
      ]
    });

    auth = TestBed.inject(AuthService) as unknown as FakeAuthService;
    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('allows access when authenticated', () => {
      auth.authenticated = true;

      expect(runGuard(authGuard)).toBeTrue();
    });

    it('redirects to the login page when not authenticated', () => {
      auth.authenticated = false;

      const result = runGuard(authGuard);

      expect(result instanceof UrlTree).toBeTrue();
      expect(router.serializeUrl(result as UrlTree)).toBe('/admin/login');
    });
  });

  describe('guestGuard', () => {
    it('allows access to the login page when signed out', () => {
      auth.authenticated = false;

      expect(runGuard(guestGuard)).toBeTrue();
    });

    it('redirects an already signed-in admin to the dashboard', () => {
      auth.authenticated = true;

      const result = runGuard(guestGuard);

      expect(result instanceof UrlTree).toBeTrue();
      expect(router.serializeUrl(result as UrlTree)).toBe('/admin/dashboard');
    });
  });
});
