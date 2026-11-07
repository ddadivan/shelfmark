import { Routes } from '@angular/router';
import { authOnly, guestOnly, redirectToSignIn } from './core/auth/auth.guards';

const libraryPage = () => import('./features/library/library.page');

/** The real pages. `app.routes.ts` serves them as they are; the e2e build adds a test page. */
export const pageRoutes: Routes = [
  // `/` is the landing for a guest and the app shell for a signed-in user (no redirect flicker).
  {
    path: '',
    canMatch: [guestOnly],
    loadComponent: () => import('./features/landing/landing.page'),
  },
  {
    path: '',
    canMatch: [authOnly],
    loadComponent: () => import('./shell/app-shell.component'),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'links' },
      { path: 'links', loadComponent: libraryPage },
    ],
  },
  // A guest on a protected URL: to sign-in, then back.
  { path: 'links', canActivate: [redirectToSignIn], children: [] },
  {
    path: 'sign-in',
    canMatch: [guestOnly],
    loadComponent: () => import('./features/auth/sign-in.page'),
  },
  { path: 'sign-in', redirectTo: 'links' },
];
