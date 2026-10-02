import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  ACADEMIC_PROJECT_SERVICE,
  FREELANCE_DEVELOPMENT_SERVICE
} from '../../core/constants/service-nodes';
import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

interface Service {
  title: string;
  summary: string;
  detail: string[];
  linkPath: string;
  linkParams?: Record<string, string>;
  linkLabel: string;
  /** Primary services get the larger card treatment. */
  emphasis?: boolean;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, RevealDirective],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly structuredData = inject(StructuredDataService);

  readonly services: Service[] = [
    {
      title: 'Academic project development',
      summary:
        'Mini, major, final year and IEEE-based projects across every engineering branch, delivered with everything your department asks for.',
      detail: [
        'Working implementation with full source code',
        'Project report and PPT support',
        'Viva walkthrough so you can explain it'
      ],
      linkPath: '/student-projects',
      linkLabel: 'Get final year project help',
      emphasis: true
    },
    {
      title: 'Custom web application development',
      summary:
        'Hire us by the hour, by the project, or on a monthly retainer — for an MVP, a small-business website, or to extend a team that is already stretched.',
      detail: [
        'Hourly, fixed-scope or retainer',
        'Weekly progress you can check',
        'Direct access to the engineer'
      ],
      linkPath: '/freelance-services',
      linkLabel: 'Hire a freelance full stack developer',
      emphasis: true
    },
    {
      title: 'Backend & API development',
      summary:
        'REST services in Go and Gin, backed by PostgreSQL — authentication, file uploads, and a data model built to grow.',
      detail: [],
      linkPath: '/contact',
      linkParams: { type: 'business' },
      linkLabel: 'Get a quote'
    },
    {
      title: 'Angular front ends & admin panels',
      summary:
        'Angular applications with responsive layouts, accessible components, prerendering for SEO, and an admin panel your team can use.',
      detail: [],
      linkPath: '/contact',
      linkParams: { type: 'business' },
      linkLabel: 'Get a quote'
    },
    {
      title: 'Deployment & DevOps',
      summary:
        'Docker, environment configuration, SSL, and a production deploy — plus the notes needed to do it again without us.',
      detail: [],
      linkPath: '/contact',
      linkLabel: 'Discuss deployment'
    },
    {
      title: 'Code review & consulting',
      summary:
        'An architecture review, performance audit, or a straight second opinion on a codebase you have already built.',
      detail: [],
      linkPath: '/contact',
      linkLabel: 'Book a consultation'
    }
  ];

  ngOnInit(): void {
    this.seo.update({
      title: 'Web Development & Academic Projects',
      description:
        'Custom web application development in Angular, Go and PostgreSQL, plus deployment, code review and academic project development for engineering students.',
      path: '/services',
      keywords:
        'custom web application development, academic project development, engineering project help online, hire Angular developer, hire Go developer, website development for small business, code review consulting India'
    });

    this.structuredData.apply([
      this.structuredData.breadcrumbs([
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' }
      ]),
      this.structuredData.service(FREELANCE_DEVELOPMENT_SERVICE),
      this.structuredData.service(ACADEMIC_PROJECT_SERVICE)
    ]);
  }
}
