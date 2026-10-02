import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RevealDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly structuredData = inject(StructuredDataService);

  readonly stack = [
    'Go / Gin',
    'Angular',
    'PostgreSQL',
    'REST APIs',
    'JWT auth',
    'Docker',
    'Cloud deploy'
  ];

  readonly capabilities = [
    {
      title: 'Backend & API development',
      body: 'REST services in Go with PostgreSQL, authentication, file handling and a schema that holds up as the product grows.',
      link: '/services'
    },
    {
      title: 'Custom web applications',
      body: 'Angular front ends and admin panels — responsive, accessible, prerendered where it helps search engines find you.',
      link: '/services'
    },
    {
      title: 'Deployment & handover',
      body: 'Docker, environment setup, SSL and a production deploy, handed over with documentation you can actually follow.',
      link: '/services'
    },
    {
      title: 'Code review & consulting',
      body: 'Architecture review, performance audit and a second opinion on a codebase you already have.',
      link: '/contact'
    }
  ];

  /**
   * The prose block below the capability list. It exists because the page was
   * otherwise almost entirely headings, cards and buttons — there was very
   * little indexable body copy explaining what either audience actually gets.
   */
  readonly audiences = [
    {
      heading: 'Final year project help, with the source code',
      body: 'Students come to us for a mini, major, final year or IEEE-based project that has to be built, written up and then defended in a viva. You get the complete source code with setup instructions, a project report and PPT in your department\'s format, and a walkthrough of every module so you can answer questions about any part of it. Branches covered include CSE, IT, ISE, AI/ML, data science, MCA, BCA and MSc, plus the software half of ECE and EEE projects.',
      linkPath: '/student-projects',
      linkLabel: 'See what final year project help includes'
    },
    {
      heading: 'Custom web application development for businesses',
      body: 'Founders and small businesses come to us when an off-the-shelf tool almost fits but not quite — the workflow is theirs, the pricing rules are theirs, or the data cannot leave their control. We build the whole thing: an Angular front end, a Go and PostgreSQL API behind it, an admin panel your own staff can use, and a documented production deploy. The repository and the infrastructure are yours at the end.',
      linkPath: '/freelance-services',
      linkLabel: 'Hire a freelance full stack developer'
    }
  ];

  readonly steps = [
    {
      n: '01',
      title: 'Tell us what you need',
      body: 'Fill in one form with your idea, deadline and any documents. Students can upload a synopsis; businesses can describe a scope.'
    },
    {
      n: '02',
      title: 'Get a plan and a quote',
      body: 'We reply within 24 hours with what we would build, how long it takes and what it costs. No obligation to continue.'
    },
    {
      n: '03',
      title: 'Build, deliver, hand over',
      body: 'Regular progress updates, then working code, documentation and a walkthrough so you can present or run it yourself.'
    }
  ];

  ngOnInit(): void {
    this.seo.update({
      title: 'Final Year Projects & Custom Web Apps',
      description:
        'Final year and IEEE projects with complete source code, report and PPT — plus custom web applications and MVPs for businesses. Angular, Go, PostgreSQL.',
      path: '/',
      keywords:
        'final year project with source code, final year project help, IEEE project, mini project, hire freelance full stack developer India, custom web application development, hire Angular developer, hire Go developer'
    });

    // The home page's `Organization` and `WebSite` nodes are static and live in
    // src/index.html. Clearing here only removes a graph left behind by a
    // previous client-side navigation.
    this.structuredData.clear();
  }
}
