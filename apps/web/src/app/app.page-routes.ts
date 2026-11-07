import { Routes } from '@angular/router';

/** The real pages. `app.routes.ts` serves them as they are; the e2e build adds a test page. */
export const pageRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.page'),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/privacy/privacy.page'),
  },
];
