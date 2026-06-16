import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { LeadService } from '../../../core/services/lead.service';
import { Lead } from '../../../core/models/lead.model';

type LeadFilter = 'all' | 'contact' | 'freelance' | 'business' | 'student_project';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './leads.component.html',
  styleUrl: './leads.component.scss'
})
export class LeadsComponent implements OnInit {
  private readonly leadService = inject(LeadService);

  allLeads: Lead[] = [];
  filteredLeads: Lead[] = [];
  isLoading = true;
  errorMessage = '';
  activeFilter: LeadFilter = 'all';

  readonly filters: { key: LeadFilter; label: string }[] = [
    { key: 'all', label: 'All Requests' },
    { key: 'freelance', label: 'Freelance' },
    { key: 'business', label: 'Business' },
    { key: 'student_project', label: 'Student Projects' },
    { key: 'contact', label: 'Contact' }
  ];

  ngOnInit(): void {
    this.loadLeads();
  }

  loadLeads(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.leadService.getLeads().subscribe({
      next: (leads) => {
        this.allLeads = leads;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load leads.';
        this.isLoading = false;
      }
    });
  }

  setFilter(filter: LeadFilter): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  countFor(filter: LeadFilter): number {
    if (filter === 'all') {
      return this.allLeads.length;
    }
    return this.allLeads.filter((l) => l.lead_type === filter).length;
  }

  formatType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  private applyFilter(): void {
    if (this.activeFilter === 'all') {
      this.filteredLeads = this.allLeads;
      return;
    }
    this.filteredLeads = this.allLeads.filter(
      (lead) => lead.lead_type === this.activeFilter
    );
  }
}
