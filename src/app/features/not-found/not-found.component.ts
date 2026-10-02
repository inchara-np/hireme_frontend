import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SeoService } from '../../core/services/seo.service';

/**
 * Real 404 page.
 *
 * Previously the wildcard route silently redirected to `/`, which made every
 * bad URL look like a valid homepage to both visitors and crawlers. This page
 * is marked `noindex` and keeps the attempted path visible so people can see
 * what went wrong, with routes back into the two main funnels.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  attemptedPath = '';

  ngOnInit(): void {
    this.attemptedPath = this.router.url.split('?')[0].split('#')[0];

    this.seo.update({
      title: 'Page not found',
      description:
        'The page you are looking for does not exist or has moved. Browse our services, student project help, or freelance development work instead.',
      path: '/404',
      noIndex: true
    });
  }
}
