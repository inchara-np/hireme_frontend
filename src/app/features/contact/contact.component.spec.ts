import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { ContactComponent } from './contact.component';
import { httpErrorInterceptor } from '../../core/interceptors/http-error.interceptor';
import { LEAD_TYPE } from '../../core/models/lead.model';
import { environment } from '../../../environments/environment';

const LEADS_URL = `${environment.apiUrl}/leads`;

const VALID = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  company: 'Acme',
  message: 'We need a customer portal built on top of our existing API.'
};

describe('ContactComponent', () => {
  let fixture: ComponentFixture<ContactComponent>;
  let component: ContactComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  const fill = (values: Partial<typeof VALID> = {}) =>
    component.contactForm.setValue({ ...VALID, ...values });

  // ------------------------------------------------------------- validation
  describe('validation', () => {
    it('starts invalid and empty', () => {
      expect(component.contactForm.valid).toBeFalse();
    });

    it('is valid with well-formed values', () => {
      fill();
      expect(component.contactForm.valid).toBeTrue();
    });

    it('requires name, email, phone and message', () => {
      for (const field of ['name', 'email', 'phone', 'message']) {
        const control = component.contactForm.get(field);
        control?.setValue('');
        expect(control?.hasError('required'))
          .withContext(field)
          .toBeTrue();
      }
    });

    it('treats company as optional', () => {
      fill({ company: '' });
      expect(component.contactForm.valid).toBeTrue();
    });

    it('rejects a malformed email', () => {
      fill({ email: 'not-an-email' });
      expect(component.contactForm.get('email')?.hasError('email')).toBeTrue();
      expect(component.contactForm.valid).toBeFalse();
    });

    it('rejects phone numbers that are not 10-digit Indian mobiles', () => {
      for (const bad of ['12345', '1234567890', '98765432101', 'abcdefghij']) {
        fill({ phone: bad });
        expect(component.contactForm.get('phone')?.valid)
          .withContext(bad)
          .toBeFalse();
      }
    });

    it('accepts mobile numbers starting 6-9', () => {
      for (const good of ['6000000000', '7123456789', '8123456789', '9876543210']) {
        fill({ phone: good });
        expect(component.contactForm.get('phone')?.valid)
          .withContext(good)
          .toBeTrue();
      }
    });

    it('enforces a minimum message length', () => {
      fill({ message: 'too short' });
      expect(component.contactForm.get('message')?.hasError('minlength')).toBeTrue();
    });

    it('surfaces a readable error only after the field is touched', () => {
      const control = component.contactForm.get('email');
      control?.setValue('nope');

      expect(component.isInvalid('email')).toBeFalse();

      control?.markAsTouched();
      expect(component.isInvalid('email')).toBeTrue();
      expect(component.getError('email')).toContain('valid email');
    });
  });

  // ----------------------------------------------------------------- submit
  describe('submit', () => {
    it('does not call the API when the form is invalid', () => {
      component.submit();

      httpMock.expectNone(LEADS_URL);
      expect(component.contactForm.touched).toBeTrue();
    });

    it('posts a correctly shaped payload', () => {
      fill();
      component.submit();

      const req = httpMock.expectOne(LEADS_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(
        jasmine.objectContaining({
          lead_type: LEAD_TYPE.Contact,
          name: 'Asha Rao',
          email: 'asha@example.com',
          phone: '9876543210',
          company: 'Acme',
          description: VALID.message,
          attachments: []
        })
      );

      req.flush({ message: 'created' });
    });

    it('trims whitespace from submitted values', () => {
      fill({ name: '  Asha Rao  ', company: '  Acme  ' });
      component.submit();

      const req = httpMock.expectOne(LEADS_URL);
      expect(req.request.body.name).toBe('Asha Rao');
      expect(req.request.body.company).toBe('Acme');
      req.flush({ message: 'created' });
    });

    it('normalises a pasted email with stray whitespace on blur', () => {
      // Validators.email rejects untrimmed input, so the field is normalised
      // when the user leaves it rather than showing a confusing error.
      fill({ email: '  asha@example.com  ' });
      expect(component.contactForm.get('email')?.valid).toBeFalse();

      component.trimField('email');

      expect(component.contactForm.get('email')?.value).toBe('asha@example.com');
      expect(component.contactForm.get('email')?.valid).toBeTrue();
      expect(component.contactForm.valid).toBeTrue();
    });

    it('leaves an already-clean value untouched on blur', () => {
      fill();
      component.trimField('name');
      expect(component.contactForm.get('name')?.value).toBe('Asha Rao');
    });

    it('sends the freelance lead type when ?type=freelance', () => {
      component.leadType = LEAD_TYPE.Freelance;
      fill();
      component.submit();

      const req = httpMock.expectOne(LEADS_URL);
      expect(req.request.body.lead_type).toBe(LEAD_TYPE.Freelance);
      req.flush({ message: 'created' });
    });

    it('shows a success message and resets on success', fakeAsync(() => {
      fill();
      component.submit();

      httpMock.expectOne(LEADS_URL).flush({ message: 'created' });
      tick();

      expect(component.submitSuccess()).toContain('within 24 hours');
      expect(component.submitError()).toBe('');
      expect(component.isSubmitting()).toBeFalse();
      expect(component.contactForm.get('name')?.value).toBeNull();
    }));

    it('shows a network-specific message when the API is unreachable', fakeAsync(() => {
      fill();
      component.submit();

      httpMock
        .expectOne(LEADS_URL)
        .error(new ProgressEvent('error'), { status: 0 });
      tick();

      expect(component.submitError()).toContain('WhatsApp');
      expect(component.submitSuccess()).toBe('');
      expect(component.isSubmitting()).toBeFalse();
    }));

    it('shows a validation-specific message on a 400', fakeAsync(() => {
      fill();
      component.submit();

      httpMock
        .expectOne(LEADS_URL)
        .flush({ message: 'invalid request payload' }, { status: 400, statusText: 'Bad Request' });
      tick();

      expect(component.submitError()).toContain('phone number');
    }));

    it('shows a rate-limit message on a 429', fakeAsync(() => {
      fill();
      component.submit();

      httpMock
        .expectOne(LEADS_URL)
        .flush({}, { status: 429, statusText: 'Too Many Requests' });
      tick();

      expect(component.submitError()).toContain('wait a minute');
    }));

    it('keeps the form data after a failure so nothing is retyped', fakeAsync(() => {
      fill();
      component.submit();

      httpMock
        .expectOne(LEADS_URL)
        .flush({}, { status: 500, statusText: 'Server Error' });
      tick();

      expect(component.contactForm.get('name')?.value).toBe('Asha Rao');
    }));

    it('clears the loading flag whatever happens', fakeAsync(() => {
      fill();
      component.submit();
      expect(component.isSubmitting()).toBeTrue();

      httpMock
        .expectOne(LEADS_URL)
        .flush({}, { status: 500, statusText: 'Server Error' });
      tick();

      expect(component.isSubmitting()).toBeFalse();
    }));
  });
});
