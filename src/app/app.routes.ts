import { Routes } from '@angular/router';

import { HomeComponent } from './features/home/home.component';
import { ServicesComponent } from './features/services/services.component';
import { StudentProjectsComponent } from './features/student-projects/student-projects.component';
import { FreelanceServicesComponent } from './features/freelance-services/freelance-services.component';
import { ContactComponent } from './features/contact/contact.component';

import { LoginComponent } from './features/admin/login/login.component';
import { DashboardComponent } from './features/admin/dashboard/dashboard.component';
import { LeadsComponent } from './features/admin/leads/leads.component';
import { LeadDetailsComponent } from './features/admin/lead-details/lead-details.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';

import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'services',
    component: ServicesComponent
  },
  {
    path: 'student-projects',
    component: StudentProjectsComponent
  },
  {
    path: 'freelance-services',
    component: FreelanceServicesComponent
  },
  {
    path: 'contact',
    component: ContactComponent
  },
  {
    path: 'admin/login',
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'leads',
        component: LeadsComponent
      },
      {
        path: 'leads/:id',
        component: LeadDetailsComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
