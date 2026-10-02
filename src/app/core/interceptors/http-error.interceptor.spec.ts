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

import { httpErrorInterceptor } from './http-error.interceptor';
import { AppError, AppErrorKind } from '../models/app-error.model';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting()
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function expectKind(
    status: number,
    kind: AppErrorKind,
    done: DoneFn,
    body: Record<string, unknown> = {}
  ): void {
    http.get('/api/v1/thing').subscribe({
      error: (error: AppError) => {
        expect(error.kind).withContext(`status ${status}`).toBe(kind);
        expect(error.status).toBe(status);
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
        done();
      }
    });

    httpMock
      .expectOne('/api/v1/thing')
      .flush(body, { status, statusText: 'Error' });
  }

  it('classifies 400 as validation', (done) => expectKind(400, 'validation', done));
  it('classifies 422 as validation', (done) => expectKind(422, 'validation', done));
  it('classifies 401 as unauthorized', (done) => expectKind(401, 'unauthorized', done));
  it('classifies 403 as forbidden', (done) => expectKind(403, 'forbidden', done));
  it('classifies 404 as notFound', (done) => expectKind(404, 'notFound', done));
  it('classifies 409 as conflict', (done) => expectKind(409, 'conflict', done));
  it('classifies 413 as payloadTooLarge', (done) => expectKind(413, 'payloadTooLarge', done));
  it('classifies 429 as rateLimit', (done) => expectKind(429, 'rateLimit', done));
  it('classifies 418 as a generic client error', (done) => expectKind(418, 'client', done));
  it('classifies 500 as server', (done) => expectKind(500, 'server', done));
  it('classifies 503 as server', (done) => expectKind(503, 'server', done));

  it('classifies a failed connection as network', (done) => {
    http.get('/api/v1/thing').subscribe({
      error: (error: AppError) => {
        expect(error.kind).toBe('network');
        expect(error.status).toBe(0);
        expect(error.retryable).toBeTrue();
        done();
      }
    });

    httpMock
      .expectOne('/api/v1/thing')
      .error(new ProgressEvent('error'), { status: 0 });
  });

  it('marks server and network errors retryable, client errors not', (done) => {
    http.get('/api/v1/thing').subscribe({
      error: (error: AppError) => {
        expect(error.retryable).toBeFalse();
        done();
      }
    });

    httpMock
      .expectOne('/api/v1/thing')
      .flush({}, { status: 400, statusText: 'Bad Request' });
  });

  it('captures the API message without showing it verbatim', (done) => {
    http.post('/api/v1/leads', {}).subscribe({
      error: (error: AppError) => {
        expect(error.serverMessage).toBe('invalid request payload');
        // The user-facing message is our copy, not the backend's.
        expect(error.message).not.toBe('invalid request payload');
        done();
      }
    });

    httpMock
      .expectOne('/api/v1/leads')
      .flush(
        { message: 'invalid request payload' },
        { status: 400, statusText: 'Bad Request' }
      );
  });

  it('records the request URL so callers can tell uploads apart', (done) => {
    http.post('/api/v1/upload', {}).subscribe({
      error: (error: AppError) => {
        expect(error.url).toContain('/upload');
        done();
      }
    });

    httpMock
      .expectOne('/api/v1/upload')
      .flush({}, { status: 413, statusText: 'Payload Too Large' });
  });

  it('leaves successful responses untouched', (done) => {
    http.get<{ ok: boolean }>('/api/v1/thing').subscribe((res) => {
      expect(res.ok).toBeTrue();
      done();
    });

    httpMock.expectOne('/api/v1/thing').flush({ ok: true });
  });
});
