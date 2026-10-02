import { bootstrapApplication } from '@angular/platform-browser';
import {
  provideClientHydration,
  withEventReplay
} from '@angular/platform-browser';

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

/**
 * Hydration is enabled for the prerendered public pages, and deliberately
 * skipped for `/admin/**`.
 *
 * Why: the site is deployed to Cloudflare Workers as static assets with
 * `not_found_handling: "single-page-application"`, so a hard load of
 * `/admin/leads/123` is served the prerendered *homepage* HTML. Hydrating that
 * markup into a completely different component tree produces NG0500 mismatch
 * errors and a visible re-render. Admin needs no SEO and no hydration, so on
 * those URLs we clear the shell and boot as a normal client-side app.
 */
const isAdminRoute = location.pathname.startsWith('/admin');

if (isAdminRoute) {
  // Drop the prerendered homepage markup and its hydration annotations before
  // bootstrapping, so nothing is left for Angular to try to reuse.
  const root = document.querySelector('app-root');
  if (root) {
    root.innerHTML = '';
  }
  document
    .querySelectorAll('script[id="ng-state"], script[type="application/json"][id^="ng-state"]')
    .forEach((el) => el.remove());
}

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...appConfig.providers,
    ...(isAdminRoute ? [] : [provideClientHydration(withEventReplay())])
  ]
}).catch((err) => console.error(err));
