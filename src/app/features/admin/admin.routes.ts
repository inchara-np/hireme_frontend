import { Routes } from '@angular/router';

/**
 * Admin sub-tree. Loaded as one chunk from `app.routes.ts` behind `authGuard`,
 * so none of this — layout, dashboard, leads table, lead details — reaches a
 * public visitor's browser.
 */
export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          )
      },
      {
        path: 'leads',
        loadComponent: () =>
          import('./leads/leads.component').then((m) => m.LeadsComponent)
      },
      {
        path: 'leads/:id',
        loadComponent: () =>
          import('./lead-details/lead-details.component').then(
            (m) => m.LeadDetailsComponent
          )
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
