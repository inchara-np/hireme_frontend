import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api.constants';
import {
  DEFAULT_PAGE_SIZE,
  DashboardResponse,
  Lead,
  LeadRequest,
  PaginatedResponse
} from '../models/lead.model';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  createLead(request: LeadRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}${API_ENDPOINTS.LEADS}`,
      request
    );
  }

  /**
   * `GET /admin/leads` returns a paginated envelope:
   * `{ data, page, page_size, total, total_pages }`.
   *
   * The response is normalised through `toPage()` so a bare array — which is
   * what older backend builds returned — still works instead of crashing the
   * admin panel during a rolling deploy.
   */
  getLeads(
    page = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Observable<PaginatedResponse<Lead>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http
      .get<PaginatedResponse<Lead> | Lead[]>(
        `${this.baseUrl}${API_ENDPOINTS.ADMIN_LEADS}`,
        { params }
      )
      .pipe(map((response) => this.toPage(response, page, pageSize)));
  }

  getLead(id: string): Observable<Lead> {
    return this.http.get<Lead>(
      `${this.baseUrl}${API_ENDPOINTS.ADMIN_LEADS}/${id}`
    );
  }

  updateLeadStatus(id: string, status: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.baseUrl}${API_ENDPOINTS.ADMIN_LEADS}/${id}/status`,
      { status }
    );
  }

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(
      `${this.baseUrl}${API_ENDPOINTS.DASHBOARD}`
    );
  }

  private toPage(
    response: PaginatedResponse<Lead> | Lead[] | null,
    requestedPage: number,
    requestedPageSize: number
  ): PaginatedResponse<Lead> {
    if (Array.isArray(response)) {
      return {
        data: response,
        page: 1,
        page_size: response.length,
        total: response.length,
        total_pages: 1
      };
    }

    const data = Array.isArray(response?.data) ? response.data : [];
    const total = response?.total ?? data.length;
    const pageSize = response?.page_size || requestedPageSize || data.length || 1;

    return {
      data,
      page: response?.page ?? requestedPage,
      page_size: pageSize,
      total,
      total_pages:
        response?.total_pages ?? Math.max(1, Math.ceil(total / pageSize))
    };
  }
}
