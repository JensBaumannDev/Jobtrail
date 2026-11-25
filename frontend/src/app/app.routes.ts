import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'applications' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((module) => module.Login),
  },
  {
    path: 'applications',
    loadComponent: () =>
      import('./pages/applications/applications').then((module) => module.Applications),
  },
  {
    path: 'watchlist',
    loadComponent: () => import('./pages/watchlist/watchlist').then((module) => module.Watchlist),
  },
  {
    path: 'pdf',
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
