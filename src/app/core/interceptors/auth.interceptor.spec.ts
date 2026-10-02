import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

class FakeAuthService {
  token: string | null = 'test-token';
  logoutCalled = false;

  getToken(): string | null {
    return this.token;
  }

  logout(): void {
    this.logoutCalled = true;
    this.token = null;
  }
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: FakeAuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useClass: FakeAuthService }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService) as unknown as FakeAuthService;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  // ------------------------------------------------------- attaching tokens
  it('attaches the bearer token to admin requests', () => {
    http.get('/api/v1/admin/leads').subscribe();

    const req = httpMock.expectOne('/api/v1/admin/leads');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush([]);
  });

  it('does not attach the token to public requests', () => {
    http.post('/api/v1/leads', {}).subscribe();

    const req = httpMock.expectOne('/api/v1/leads');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ message: 'ok' });
  });

  it('does not attach the token to the login request', () => {
    http.post('/api/v1/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ token: 'x' });
  });

  it('sends no Authorization header when there is no token', () => {
    auth.token = null;

    http.get('/api/v1/admin/leads').subscribe();

    const req = httpMock.expectOne('/api/v1/admin/leads');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  // ------------------------------------------------------- 401 side effects
  it('signs out and redirects on a 401 from an admin endpoint', () => {
    http.get('/api/v1/admin/leads').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/v1/admin/leads')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logoutCalled).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/login']);
  });

  it('does not sign out on a 401 from a public endpoint', () => {
    http.post('/api/v1/leads', {}).subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/v1/leads')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logoutCalled).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('leaves other admin errors alone', () => {
    http.get('/api/v1/admin/leads').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/v1/admin/leads')
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(auth.logoutCalled).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('propagates the error to the caller', (done) => {
    http.get('/api/v1/admin/leads').subscribe({
      error: (err) => {
        expect(err.status).toBe(403);
        done();
      }
    });

    httpMock
      .expectOne('/api/v1/admin/leads')
      .flush({}, { status: 403, statusText: 'Forbidden' });
  });
});
