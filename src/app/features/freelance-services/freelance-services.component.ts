import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FREELANCE_DEVELOPMENT_SERVICE } from '../../core/constants/service-nodes';
import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  FaqComponent,
  FaqItem
} from '../../shared/components/faq/faq.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

interface EngagementModel {
  name: string;
  shape: string;
  bestFor: string;
  points: string[];
  recommended?: boolean;
}

@Component({
  selector: 'app-freelance-services',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent,
    FaqComponent,
    RevealDirective
  ],
  templateUrl: './freelance-services.component.html',
  styleUrl: './freelance-services.component.scss'
})
export class FreelanceServicesComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly structuredData = inject(StructuredDataService);

  readonly offerings = [
    {
      title: 'Backend & API work',
      body: 'REST APIs, authentication, database design and integrations in Go with PostgreSQL.'
    },
    {
      title: 'Frontend & dashboards',
      body: 'Angular applications, internal tools and admin panels — responsive and accessible.'
    },
    {
      title: 'MVP & full-stack builds',
      body: 'An MVP taken from a written requirement through to a deployed, documented product.'
    },
    {
      title: 'Maintenance & rescue',
      body: 'Bug fixes, performance work, code review and modernising a codebase you inherited.'
    }
  ];

  readonly models: EngagementModel[] = [
    {
      name: 'Hourly',
      shape: 'Pay for the time used',
      bestFor: 'Small changes, bug fixes and consultations',
      points: [
        'No minimum commitment',
        'Logged hours you can review',
        'Good for uncertain scope'
      ]
    },
    {
      name: 'Fixed scope',
      shape: 'One agreed price',
      bestFor: 'MVPs, defined features and clear deliverables',
      points: [
        'Written scope before work starts',
        'Milestone-based delivery',
        'Weekly progress updates'
      ],
      recommended: true
    },
    {
      name: 'Monthly retainer',
      shape: 'Reserved capacity',
      bestFor: 'Products that need continuous development',
      points: [
        'Agreed availability each month',
        'Priority on your queue',
        'Scope can change month to month'
      ]
    }
  ];

  /**
   * Visible FAQ and the page's `FAQPage` structured data read from this one
   * array. Nothing here states a rate, a turnaround or a guarantee the owner
   * has not actually committed to — scope and price are quoted per enquiry.
   */
  readonly faqs: FaqItem[] = [
    {
      question: 'How do we agree on scope and price?',
      answer:
        'You send the scope, the deadline and a rough budget. We come back with what we would build, what we would leave out of version one, and a single number or rate in writing. Nothing starts until that is in front of you and you have agreed to it. There is no published rate card because a two-week fixed-scope build and an open-ended retainer are not comparable things.'
    },
    {
      question: 'Do you sign an NDA before we share details?',
      answer:
        'Yes. If the idea or the data is sensitive, send the NDA before you send the details and we will sign it — that is a normal first step, not an awkward one. If you do not have an NDA drafted, say so and we will simply treat everything you send as confidential.'
    },
    {
      question: 'Who owns the code when the project ends?',
      answer:
        'You do. At handover you get the repository, the database schema and migrations, the environment configuration and the deployment notes. Nothing is held back as leverage, and nothing in the build depends on an account only we can access.'
    },
    {
      question: 'Can you work on a codebase somebody else wrote?',
      answer:
        'Yes — bug fixes, performance work, dependency upgrades and plain code review on an inherited project are a regular part of what we do. Expect us to spend the first stretch reading before changing anything, and to tell you honestly if rewriting one part is a better use of your money than patching all of it.'
    },
    {
      question: 'Do you work remotely? We are not in your city.',
      answer:
        'We work remotely with clients anywhere in India, and location has never been the constraint. Communication runs over email, WhatsApp and scheduled calls, with the updates in writing so there is a record of what was agreed rather than two different memories of it.'
    },
    {
      question: 'How do I know what is happening during the build?',
      answer:
        'You get written progress each week and working software at each milestone, not only at the end. You also talk to the engineer doing the work rather than an account manager relaying messages, which is the main reason a small change does not take three days to land.'
    },
    {
      question: 'Can you deploy it and keep it running after launch?',
      answer:
        'Deployment is part of the build: Docker, environment setup, SSL and a production deploy, handed over with notes your own team can follow. If you want us to keep developing it afterwards, the monthly retainer exists for exactly that. If you would rather take it in-house, the documentation is written so that you can.'
    },
    {
      question: 'What if the project turns out to be bigger than we thought?',
      answer:
        'We would much rather find that out in week one than month three, which is why the scope is written down before work starts. If something genuinely changes, we re-estimate that piece and you decide whether to go ahead, defer it or drop it. You will not receive an invoice for work you did not approve.'
    }
  ];

  ngOnInit(): void {
    this.seo.update({
      title: 'Hire a Freelance Full Stack Developer',
      description:
        'Hire a freelance full stack developer in India for custom web application development, MVPs and small business websites. Angular, Go and PostgreSQL. Remote.',
      path: '/freelance-services',
      keywords:
        'hire freelance full stack developer India, hire Angular developer, hire Go developer, hire Golang developer, custom web application development, MVP development for startups, website development for small business, contract software development'
    });

    this.structuredData.apply([
      this.structuredData.breadcrumbs([
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' },
        { name: 'Hire a freelance developer', path: '/freelance-services' }
      ]),
      this.structuredData.service(FREELANCE_DEVELOPMENT_SERVICE),
      this.structuredData.faqPage('/freelance-services', this.faqs)
    ]);
  }
}
