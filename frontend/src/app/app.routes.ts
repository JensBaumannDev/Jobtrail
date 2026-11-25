import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'applications' },
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./pages/login/login').then((module) => module.Login),
  },
  {
    path: 'applications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/applications/applications').then((module) => module.Applications),
  },
  {
    path: 'watchlist',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/watchlist/watchlist').then((module) => module.Watchlist),
  },
  {
    path: 'pdf',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pdf-overview/pdf-overview').then((module) => module.PdfOverview),
  },
  {
    path: 'imprint',
    loadComponent: () =>
      import('./pages/legal-notice/legal-notice').then((module) => module.LegalNotice),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy').then((module) => module.PrivacyPolicy),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((module) => module.NotFound),
  },
];
