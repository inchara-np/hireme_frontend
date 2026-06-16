import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../constants/api.constants';
import { DashboardResponse, Lead, LeadRequest } from '../models/lead.model';

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

  getLeads(): Observable<Lead[]> {
    return this.http.get<Lead[]>(
      `${this.baseUrl}${API_ENDPOINTS.ADMIN_LEADS}`
    );
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
}
