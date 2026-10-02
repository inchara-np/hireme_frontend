import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LeadService } from '../../../core/services/lead.service';
import { SeoService } from '../../../core/services/seo.service';
import {
  DEFAULT_PAGE_SIZE,
  LEAD_TYPE,
  Lead,
  LeadType,
  PAGE_SIZE_OPTIONS,
  leadStatusLabel,
  leadStatusTone,
  leadTypeLabel
} from '../../../core/models/lead.model';
import { errorMessage } from '../../../core/models/app-error.model';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

type LeadFilter = LeadType | 'all';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [RouterLink, DatePipe, AlertComponent],
  templateUrl: './leads.component.html',
  styleUrl: './leads.component.scss'
})
export class LeadsComponent implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly seo = inject(SeoService);

  /** Leads for the current page only — the API paginates server-side. */
  readonly pageLeads = signal<Lead[]>([]);
  readonly isLoading = signal(true);
  readonly errorText = signal('');
  readonly activeFilter = signal<LeadFilter>('all');

  // --- pagination state (mirrors the API envelope) ------------------------
  readonly page = signal(1);
  readonly pageSize = signal<number>(DEFAULT_PAGE_SIZE);
  readonly total = signal(0);
  readonly totalPages = signal(1);

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly filters: { key: LeadFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: LEAD_TYPE.StudentProject, label: 'Student projects' },
    { key: LEAD_TYPE.Freelance, label: 'Freelance' },
    { key: LEAD_TYPE.Business, label: 'Business' },
    { key: LEAD_TYPE.Contact, label: 'Contact' }
  ];

  /**
   * Type filtering happens client-side on the loaded page, because the API
   * exposes only `page`/`pageSize` — there is no server-side type filter to
   * call. The UI says so explicitly rather than implying these counts cover
   * all {{total}} requests.
   */
  readonly filteredLeads = computed(() => {
    const filter = this.activeFilter();
    const leads = this.pageLeads();
    return filter === 'all'
      ? leads
      : leads.filter((lead) => lead.lead_type === filter);
  });

  readonly hasPrev = computed(() => this.page() > 1);
  readonly hasNext = computed(() => this.page() < this.totalPages());

  /** "Showing 26–50 of 143" */
  readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1
  );

  readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total())
  );

  ngOnInit(): void {
    this.seo.setNoIndex('Requests', '/admin/leads');
    this.loadLeads();
  }

  loadLeads(): void {
    this.isLoading.set(true);
    this.errorText.set('');

    this.leadService.getLeads(this.page(), this.pageSize()).subscribe({
      next: (result) => {
        this.pageLeads.set(result.data);
        this.page.set(result.page);
        this.pageSize.set(result.page_size);
        this.total.set(result.total);
        this.totalPages.set(result.total_pages);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorText.set(
          errorMessage(error, {
            network:
              'Cannot reach the API. Check that the backend is running and reachable.',
            unauthorized: 'Your session expired. Sign in again to continue.',
            server:
              'The API returned an error loading requests. Try again shortly.'
          })
        );
        this.pageLeads.set([]);
        this.isLoading.set(false);
      }
    });
  }

  goToPage(page: number): void {
    const target = Math.min(Math.max(1, page), this.totalPages());
    if (target === this.page()) {
      return;
    }
    this.page.set(target);
    this.loadLeads();
    this.scrollToTop();
  }

  changePageSize(value: string | number): void {
    const size = Number(value) || DEFAULT_PAGE_SIZE;
    if (size === this.pageSize()) {
      return;
    }
    this.pageSize.set(size);
    // Row offsets change meaning with a new page size — go back to page 1.
    this.page.set(1);
    this.loadLeads();
  }

  setFilter(filter: LeadFilter): void {
    this.activeFilter.set(filter);
  }

  /** Count within the current page — see the note on `filteredLeads`. */
  countFor(filter: LeadFilter): number {
    const leads = this.pageLeads();
    return filter === 'all'
      ? leads.length
      : leads.filter((lead) => lead.lead_type === filter).length;
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Label/tone lookups come from the shared lead model, so the admin table and
  // the forms can never disagree about what a status string means.
  typeLabel = leadTypeLabel;
  statusLabel = leadStatusLabel;
  statusTone = leadStatusTone;
}
