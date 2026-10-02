import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import {
  provideClientHydration,
  withEventReplay
} from '@angular/platform-browser';
import { provideServerRouting } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

/**
 * Build-time only. There is no runtime Node server: `angular.json` uses
 * `outputMode: "static"`, so this config is used by the prerenderer to emit
 * HTML for the public routes and is never loaded in production.
 *
 * `provideClientHydration` is included here so the prerendered HTML carries
 * the `ngh` hydration annotations that `main.ts` consumes on public routes.
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRouting(serverRoutes),
    provideClientHydration(withEventReplay())
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
