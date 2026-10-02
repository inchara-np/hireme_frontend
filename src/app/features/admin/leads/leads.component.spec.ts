import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { LeadsComponent } from './leads.component';
import { httpErrorInterceptor } from '../../../core/interceptors/http-error.interceptor';
import { LEAD_TYPE, Lead } from '../../../core/models/lead.model';
import { environment } from '../../../../environments/environment';

const ADMIN_LEADS_URL = `${environment.apiUrl}/admin/leads`;

function lead(id: string, type: string, status = 'NEW'): Lead {
  return {
    id,
    lead_type: type,
    name: `Person ${id}`,
    email: `p${id}@example.com`,
    phone: '9876543210',
    description: 'Something',
    attachments: [],
    status,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z'
  };
}

describe('LeadsComponent', () => {
  let fixture: ComponentFixture<LeadsComponent>;
  let component: LeadsComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LeadsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Matches the request regardless of query params and returns it. */
  function expectLeadsRequest(): TestRequest {
    return httpMock.expectOne((req) => req.url === ADMIN_LEADS_URL);
  }

  function initWith(body: Record<string, unknown> | Lead[]): TestRequest {
    fixture.detectChanges(); // triggers ngOnInit -> loadLeads
    const req = expectLeadsRequest();
    req.flush(body);
    return req;
  }

  const pageOf = (leads: Lead[], overrides: Record<string, number> = {}) => ({
    data: leads,
    page: 1,
    page_size: 25,
    total: leads.length,
    total_pages: 1,
    ...overrides
  });

  // ------------------------------------------------------- paginated envelope
  describe('paginated response', () => {
    it('requests page 1 with the default page size', () => {
      fixture.detectChanges();

      const req = expectLeadsRequest();
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('25');

      req.flush(pageOf([]));
    });

    it('reads rows from the envelope `data` field', () => {
      initWith(
        pageOf([lead('1', LEAD_TYPE.Contact), lead('2', LEAD_TYPE.Freelance)])
      );

      expect(component.pageLeads().length).toBe(2);
      expect(component.errorText()).toBe('');
    });

    it('stores the pagination metadata', () => {
      initWith(
        pageOf([lead('1', LEAD_TYPE.Contact)], {
          page: 2,
          page_size: 25,
          total: 143,
          total_pages: 6
        })
      );

      expect(component.page()).toBe(2);
      expect(component.total()).toBe(143);
      expect(component.totalPages()).toBe(6);
    });

    it('still works if the API returns a bare array', () => {
      // Defensive: older backend builds returned an unwrapped list.
      initWith([lead('1', LEAD_TYPE.Contact), lead('2', LEAD_TYPE.Business)]);

      expect(component.pageLeads().length).toBe(2);
      expect(component.total()).toBe(2);
      expect(component.totalPages()).toBe(1);
    });
  });

  // ------------------------------------------------------------- page ranges
  describe('range display', () => {
    it('reports the row range on a middle page', () => {
      initWith(
        pageOf(Array.from({ length: 25 }, (_, i) => lead(String(i), LEAD_TYPE.Contact)), {
          page: 3,
          page_size: 25,
          total: 143,
          total_pages: 6
        })
      );

      expect(component.rangeStart()).toBe(51);
      expect(component.rangeEnd()).toBe(75);
    });

    it('clamps the end of the range on the last page', () => {
      initWith(
        pageOf(Array.from({ length: 18 }, (_, i) => lead(String(i), LEAD_TYPE.Contact)), {
          page: 6,
          page_size: 25,
          total: 143,
          total_pages: 6
        })
      );

      expect(component.rangeStart()).toBe(126);
      expect(component.rangeEnd()).toBe(143);
    });

    it('reports a zero range when there are no results', () => {
      initWith(pageOf([], { total: 0, total_pages: 1 }));

      expect(component.rangeStart()).toBe(0);
      expect(component.rangeEnd()).toBe(0);
    });
  });

  // ------------------------------------------------------------- navigation
  describe('page navigation', () => {
    beforeEach(() => {
      initWith(
        pageOf([lead('1', LEAD_TYPE.Contact)], {
          page: 1,
          total: 143,
          total_pages: 6
        })
      );
    });

    it('knows when there is a next page but no previous one', () => {
      expect(component.hasPrev()).toBeFalse();
      expect(component.hasNext()).toBeTrue();
    });

    it('fetches the requested page', () => {
      component.goToPage(2);

      const req = expectLeadsRequest();
      expect(req.request.params.get('page')).toBe('2');
      req.flush(pageOf([lead('2', LEAD_TYPE.Contact)], { page: 2, total: 143, total_pages: 6 }));

      expect(component.page()).toBe(2);
    });

    it('does not refetch when already on that page', () => {
      component.goToPage(1);
      httpMock.expectNone((req) => req.url === ADMIN_LEADS_URL);
    });

    it('clamps navigation beyond the last page', () => {
      component.goToPage(99);

      const req = expectLeadsRequest();
      expect(req.request.params.get('page')).toBe('6');
      req.flush(pageOf([], { page: 6, total: 143, total_pages: 6 }));
    });

    it('clamps navigation below page 1', () => {
      component.goToPage(0);
      httpMock.expectNone((req) => req.url === ADMIN_LEADS_URL);
    });

    it('returns to page 1 when the page size changes', () => {
      component.goToPage(3);
      expectLeadsRequest().flush(
        pageOf([], { page: 3, total: 143, total_pages: 6 })
      );

      component.changePageSize(100);

      const req = expectLeadsRequest();
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('100');
      req.flush(pageOf([], { page: 1, page_size: 100, total: 143, total_pages: 2 }));
    });
  });

  // ---------------------------------------------------------------- filters
  describe('type filter', () => {
    beforeEach(() => {
      initWith(
        pageOf([
          lead('1', LEAD_TYPE.Contact),
          lead('2', LEAD_TYPE.StudentProject),
          lead('3', LEAD_TYPE.StudentProject),
          lead('4', LEAD_TYPE.Freelance)
        ])
      );
    });

    it('shows everything by default', () => {
      expect(component.filteredLeads().length).toBe(4);
    });

    it('filters the loaded page by lead type', () => {
      component.setFilter(LEAD_TYPE.StudentProject);
      expect(component.filteredLeads().length).toBe(2);
    });

    it('counts within the loaded page', () => {
      expect(component.countFor('all')).toBe(4);
      expect(component.countFor(LEAD_TYPE.StudentProject)).toBe(2);
      expect(component.countFor(LEAD_TYPE.Business)).toBe(0);
    });

    it('does not issue a request when filtering (client-side only)', () => {
      component.setFilter(LEAD_TYPE.Freelance);
      httpMock.expectNone((req) => req.url === ADMIN_LEADS_URL);
    });
  });

  // ----------------------------------------------------------------- errors
  describe('errors', () => {
    it('shows a network message and clears rows', () => {
      fixture.detectChanges();
      expectLeadsRequest().error(new ProgressEvent('error'), { status: 0 });

      expect(component.errorText()).toContain('Cannot reach the API');
      expect(component.pageLeads().length).toBe(0);
      expect(component.isLoading()).toBeFalse();
    });

    it('shows a session message on 401', () => {
      fixture.detectChanges();
      expectLeadsRequest().flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(component.errorText()).toContain('session expired');
    });
  });
});
