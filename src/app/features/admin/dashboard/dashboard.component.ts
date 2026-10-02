import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LeadService } from '../../../core/services/lead.service';
import { SeoService } from '../../../core/services/seo.service';
import {
  DASHBOARD_STAT,
  DashboardResponse
} from '../../../core/models/lead.model';
import { errorMessage } from '../../../core/models/app-error.model';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

interface StatTile {
  key: string;
  label: string;
  hint: string;
  tone: 'total' | 'new' | 'progress' | 'done';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, AlertComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly seo = inject(SeoService);

  readonly dashboard = signal<DashboardResponse | null>(null);
  readonly isLoading = signal(true);
  readonly errorText = signal('');

  readonly tiles: StatTile[] = [
    {
      key: DASHBOARD_STAT.Total,
      label: 'Total requests',
      hint: 'Everything ever submitted',
      tone: 'total'
    },
    {
      key: DASHBOARD_STAT.New,
      label: 'New',
      hint: 'Not contacted yet',
      tone: 'new'
    },
    {
      key: DASHBOARD_STAT.InProgress,
      label: 'In progress',
      hint: 'Being worked on',
      tone: 'progress'
    },
    {
      key: DASHBOARD_STAT.Completed,
      label: 'Completed',
      hint: 'Delivered and closed',
      tone: 'done'
    }
  ];

  ngOnInit(): void {
    this.seo.setNoIndex('Dashboard', '/admin/dashboard');
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.errorText.set('');

    this.leadService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorText.set(
          errorMessage(error, {
            network:
              'Cannot reach the API. Check that the backend is running and reachable.',
            unauthorized: 'Your session expired. Sign in again to continue.',
            server: 'The API returned an error loading the dashboard. Try again shortly.'
          })
        );
        this.isLoading.set(false);
      }
    });
  }

  statValue(key: string): number {
    return this.dashboard()?.stats?.[key] ?? 0;
  }
}
