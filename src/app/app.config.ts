import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      // Scroll to top on navigation, honour #fragments, and restore position
      // on back/forward.
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    ),
    // NOTE: `provideClientHydration(withEventReplay())` is deliberately NOT
    // here. It is added by `main.ts` (browser) and `app.config.server.ts`
    // (prerender) so that hydration can be skipped on /admin/** — see the
    // comment in main.ts for why.
    provideHttpClient(
      withFetch(),
      // Order matters: authInterceptor attaches the bearer token and owns the
      // 401 -> logout redirect; httpErrorInterceptor then normalises whatever
      // is still failing into an AppError for components to render.
      withInterceptors([authInterceptor, httpErrorInterceptor])
    )
  ]
};
