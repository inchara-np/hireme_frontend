import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { LoginComponent } from './login.component';
import { httpErrorInterceptor } from '../../../core/interceptors/http-error.interceptor';
import { environment } from '../../../../environments/environment';

const LOGIN_URL = `${environment.apiUrl}/auth/login`;

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  const fill = (email = 'admin@example.com', password = 'secret123') =>
    component.loginForm.setValue({ email, password });

  // ------------------------------------------------------------- validation
  describe('validation', () => {
    it('starts invalid', () => {
      expect(component.loginForm.valid).toBeFalse();
    });

    it('is valid with an email and a 6+ character password', () => {
      fill();
      expect(component.loginForm.valid).toBeTrue();
    });

    it('requires both fields', () => {
      fill('', '');
      expect(component.loginForm.get('email')?.hasError('required')).toBeTrue();
      expect(component.loginForm.get('password')?.hasError('required')).toBeTrue();
    });

    it('rejects a malformed email', () => {
      fill('nope', 'secret123');
      expect(component.loginForm.get('email')?.hasError('email')).toBeTrue();
    });

    it('rejects a password shorter than 6 characters', () => {
      fill('admin@example.com', '12345');
      expect(component.loginForm.get('password')?.hasError('minlength')).toBeTrue();
    });

    it('shows an error message once the field is touched', () => {
      const control = component.loginForm.get('email');
      control?.setValue('nope');
      control?.markAsTouched();

      expect(component.isInvalid('email')).toBeTrue();
      expect(component.getError('email')).toContain('valid email');
    });
  });

  // ----------------------------------------------------------------- submit
  describe('submit', () => {
    it('does not call the API when invalid', () => {
      component.submit();

      httpMock.expectNone(LOGIN_URL);
      expect(component.loginForm.touched).toBeTrue();
    });

    it('posts the credentials', () => {
      fill();
      component.submit();

      const req = httpMock.expectOne(LOGIN_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.email).toBe('admin@example.com');

      req.flush({ token: 'header.eyJleHAiOjk5OTk5OTk5OTl9.sig' });
    });

    it('navigates to the dashboard on success', fakeAsync(() => {
      fill();
      component.submit();

      httpMock
        .expectOne(LOGIN_URL)
        .flush({ token: 'header.eyJleHAiOjk5OTk5OTk5OTl9.sig' });
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
      expect(component.errorMessageText()).toBe('');
    }));

    it('shows a generic message on a 401, never revealing which field was wrong', fakeAsync(() => {
      fill();
      component.submit();

      httpMock
        .expectOne(LOGIN_URL)
        .flush({ message: 'user not found' }, { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(component.errorMessageText()).toBe('Incorrect email or password.');
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('uses the same wording for a 404 as for a 401', fakeAsync(() => {
      fill();
      component.submit();

      httpMock
        .expectOne(LOGIN_URL)
        .flush({}, { status: 404, statusText: 'Not Found' });
      tick();

      expect(component.errorMessageText()).toBe('Incorrect email or password.');
    }));

    it('explains a rate limit', fakeAsync(() => {
      fill();
      component.submit();

      httpMock
        .expectOne(LOGIN_URL)
        .flush({}, { status: 429, statusText: 'Too Many Requests' });
      tick();

      expect(component.errorMessageText()).toContain('Too many sign-in attempts');
    }));

    it('explains an unreachable API', fakeAsync(() => {
      fill();
      component.submit();

      httpMock
        .expectOne(LOGIN_URL)
        .error(new ProgressEvent('error'), { status: 0 });
      tick();

      expect(component.errorMessageText()).toContain('Cannot reach the API');
    }));

    it('clears the loading flag after failure', fakeAsync(() => {
      fill();
      component.submit();
      expect(component.isSubmitting()).toBeTrue();

      httpMock
        .expectOne(LOGIN_URL)
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(component.isSubmitting()).toBeFalse();
    }));
  });
});
