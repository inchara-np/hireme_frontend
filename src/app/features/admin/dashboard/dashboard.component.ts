import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LeadService } from '../../../core/services/lead.service';
import { DashboardResponse } from '../../../core/models/lead.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly leadService = inject(LeadService);

  dashboard: DashboardResponse | null = null;
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.leadService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load dashboard.';
        this.isLoading = false;
      }
    });
  }
}
