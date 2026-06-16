import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';

import { LeadService } from '../../../core/services/lead.service';
import { Lead } from '../../../core/models/lead.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-lead-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './lead-details.component.html',
  styleUrl: './lead-details.component.scss'
})
export class LeadDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly leadService = inject(LeadService);
  private routeSub?: Subscription;

  lead: Lead | null = null;
  selectedStatus = '';
  isLoading = true;
  isUpdating = false;
  errorMessage = '';
  successMessage = '';

  readonly statusOptions = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];

  attachmentUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${environment.apiOrigin}${path}`;
  }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.errorMessage = 'Invalid lead id.';
        this.isLoading = false;
        return;
      }
      this.loadLead(id);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  updateStatus(): void {
    if (!this.lead || this.selectedStatus === this.lead.status) {
      return;
    }

    this.isUpdating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.leadService
      .updateLeadStatus(this.lead.id, this.selectedStatus)
      .pipe(finalize(() => (this.isUpdating = false)))
      .subscribe({
        next: () => {
          this.lead!.status = this.selectedStatus;
          this.successMessage = 'Status updated successfully.';
        },
        error: () => {
          this.errorMessage = 'Unable to update status.';
        }
      });
  }

  private loadLead(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.lead = null;

    this.leadService.getLead(id).subscribe({
      next: (lead) => {
        this.lead = lead;
        this.selectedStatus = lead.status;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load lead details.';
        this.isLoading = false;
      }
    });
  }
}
