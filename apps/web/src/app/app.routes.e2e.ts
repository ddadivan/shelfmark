import { Routes } from '@angular/router';
import { pageRoutes } from './app.page-routes';

/**
 * Routes of the `e2e` build configuration only (file replacement of `app.routes.ts`).
 * `/__e2e/csp` renders runtime component styles so the CSP e2e test can prove they run under the
 * nonce policy (ADR 0022); `/__e2e/add-link` opens the add-link dialog against the mock APIs. The
 * production build never imports this file.
 */
export const appRoutes: Routes = [
  ...pageRoutes,
  {
    path: '__e2e/csp',
    loadComponent: () => import('./features/e2e-csp/e2e-csp.page'),
  },
  {
    path: '__e2e/add-link',
    loadComponent: () => import('./features/e2e-add-link/e2e-add-link.page'),
  },
];
