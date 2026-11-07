import { Routes } from '@angular/router';
import { APP_PATH } from './models/app-path.const';
import { authOnly, guestOnly, redirectToSignIn } from './core/auth/auth.guards';

const libraryPage = () => import('./features/library/library.page');
const settingsPage = () => import('./features/settings/settings.page');

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
      { path: '', pathMatch: 'full', redirectTo: APP_PATH.Links },
      { path: APP_PATH.Links, loadComponent: libraryPage },
      { path: APP_PATH.Settings, loadComponent: settingsPage },
    ],
  },
  // A guest on a protected URL: to sign-in, then back.
  { path: APP_PATH.Links, canActivate: [redirectToSignIn], children: [] },
  { path: APP_PATH.Settings, canActivate: [redirectToSignIn], children: [] },
  {
    path: APP_PATH.SignIn,
    canMatch: [guestOnly],
    loadComponent: () => import('./features/auth/sign-in.page'),
  },
  { path: APP_PATH.SignIn, redirectTo: APP_PATH.Links },
];
