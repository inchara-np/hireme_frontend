import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { LeadService } from '../../../core/services/lead.service';
import { SeoService } from '../../../core/services/seo.service';
import {
  LEAD_STATUSES,
  Lead,
  leadStatusLabel,
  leadStatusTone,
  leadTypeLabel
} from '../../../core/models/lead.model';
import { errorMessage } from '../../../core/models/app-error.model';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-lead-details',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, AlertComponent],
  templateUrl: './lead-details.component.html',
  styleUrl: './lead-details.component.scss'
})
export class LeadDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leadService = inject(LeadService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lead = signal<Lead | null>(null);
  readonly isLoading = signal(true);
  readonly isUpdating = signal(false);
  readonly errorText = signal('');
  readonly updateError = signal('');
  readonly successText = signal('');

  selectedStatus = '';

  readonly statusOptions = LEAD_STATUSES;

  statusLabel = leadStatusLabel;
  statusTone = leadStatusTone;
  typeLabel = leadTypeLabel;

  private leadId = '';

  ngOnInit(): void {
    this.seo.setNoIndex('Request details', '/admin/leads');

    // takeUntilDestroyed replaces the manual Subscription + ngOnDestroy that
    // was here before.
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        if (!id) {
          this.errorText.set('That request link is missing an ID.');
          this.isLoading.set(false);
          return;
        }
        this.leadId = id;
        this.loadLead(id);
      });
  }

  loadLead(id: string = this.leadId): void {
    this.isLoading.set(true);
    this.errorText.set('');
    this.updateError.set('');
    this.successText.set('');
    this.lead.set(null);

    this.leadService.getLead(id).subscribe({
      next: (lead) => {
        this.lead.set(lead);
        this.selectedStatus = lead.status;
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorText.set(
          errorMessage(error, {
            notFound: 'That request no longer exists. It may have been deleted.',
            network:
              'Cannot reach the API. Check that the backend is running and reachable.',
            unauthorized: 'Your session expired. Sign in again to continue.'
          })
        );
        this.isLoading.set(false);
      }
    });
  }

  updateStatus(): void {
    const current = this.lead();

    // Re-check the lead here instead of asserting it is non-null further down:
    // the request is async, and the lead can be cleared by a reload while it
    // is in flight.
    if (!current || this.selectedStatus === current.status) {
      return;
    }

    const nextStatus = this.selectedStatus;
    this.isUpdating.set(true);
    this.updateError.set('');
    this.successText.set('');

    this.leadService
      .updateLeadStatus(current.id, nextStatus)
      .pipe(finalize(() => this.isUpdating.set(false)))
      .subscribe({
        next: () => {
          this.lead.update((lead) =>
            lead ? { ...lead, status: nextStatus } : lead
          );
          this.successText.set(
            `Status updated to ${leadStatusLabel(nextStatus)}.`
          );
        },
        error: (error: unknown) => {
          // Put the dropdown back to what the server still believes.
          this.selectedStatus = this.lead()?.status ?? nextStatus;
          this.updateError.set(
            errorMessage(error, {
              validation: 'That status was rejected by the API.',
              unauthorized: 'Your session expired. Sign in again to continue.',
              network: 'Cannot reach the API. The status was not changed.'
            })
          );
        }
      });
  }

  attachmentUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${environment.apiOrigin}${path}`;
  }

  attachmentName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }

  get statusChanged(): boolean {
    const current = this.lead();
    return !!current && this.selectedStatus !== current.status;
  }
}
