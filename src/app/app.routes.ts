import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';

/**
 * Every route is lazy (`loadComponent` / `loadChildren`).
 *
 * The important split is `admin`: the layout, dashboard, leads list and lead
 * details now live in their own chunk behind `loadChildren`, so a visitor
 * reading the marketing site never downloads admin code. The public pages are
 * individually lazy too, which keeps the initial bundle to the shell plus the
 * one route being viewed — and because all five public routes are prerendered,
 * the first paint is still static HTML.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./features/services/services.component').then(
        (m) => m.ServicesComponent
      )
  },
  {
    path: 'student-projects',
    loadComponent: () =>
      import('./features/student-projects/student-projects.component').then(
        (m) => m.StudentProjectsComponent
      )
  },
  {
    path: 'freelance-services',
    loadComponent: () =>
      import('./features/freelance-services/freelance-services.component').then(
        (m) => m.FreelanceServicesComponent
      )
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact.component').then(
        (m) => m.ContactComponent
      )
  },

  // --- admin: separate lazy chunk, never shipped to public visitors -------
  {
    path: 'admin/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/admin/login/login.component').then(
        (m) => m.LoginComponent
      )
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes)
  },

  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      )
  }
];
