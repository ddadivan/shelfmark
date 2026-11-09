import { Routes } from '@angular/router';
import { LINKS_SCOPE } from './features/links/models/links-scope.const';
import { APP_PATH } from './models/app-path.const';
import { authOnly, guestOnly, redirectToSignIn } from './core/auth/auth.guards';
import { loadLibraryPage } from './features/library/load-library-page';
import LandingPage from './features/landing/landing.page';

const libraryPage = loadLibraryPage;
const settingsPage = () => import('./features/settings/settings.page');
const sharePage = () => import('./features/share/share.page');

/** The real pages. `app.routes.ts` serves them as they are; the e2e build adds a test page. */
export const pageRoutes: Routes = [
  // `/` is the landing for a guest and the app shell for a signed-in user (no redirect flicker).
  {
    path: '',
    canMatch: [guestOnly],
    // Eager on purpose: the landing is the LCP page; a lazy chunk chain delays first paint.
    component: LandingPage,
  },
  {
    path: '',
    canMatch: [authOnly],
    loadComponent: () => import('./shell/app-shell.component'),
    children: [
      { path: '', pathMatch: 'full', redirectTo: APP_PATH.Links },
      { path: APP_PATH.Links, loadComponent: libraryPage, data: { scope: LINKS_SCOPE.All } },
      {
        path: APP_PATH.Unsorted,
        loadComponent: libraryPage,
        data: { scope: LINKS_SCOPE.Unsorted },
      },
      {
        path: APP_PATH.Favorites,
        loadComponent: libraryPage,
        data: { scope: LINKS_SCOPE.Favorites },
      },
      {
        path: `${APP_PATH.Folders}/:folderId`,
        loadComponent: libraryPage,
        data: { scope: LINKS_SCOPE.Folder },
      },
      { path: APP_PATH.Settings, loadComponent: settingsPage },
    ],
  },
  // Public on purpose (no guard): guests, signed-in users and the OAuth consent screen reach it.
  { path: APP_PATH.Privacy, loadComponent: () => import('./features/privacy/privacy.page') },
  // Starts a demo session (or goes to the library when already signed in).
  { path: APP_PATH.Demo, loadComponent: () => import('./features/auth/demo-start.page') },
  // Web Share Target (Android): outside the shell, a quick save sheet. Signed-in only.
  { path: APP_PATH.Share, canMatch: [authOnly], loadComponent: sharePage },
  // A guest on a protected URL: to sign-in, then back.
  { path: APP_PATH.Links, canActivate: [redirectToSignIn], children: [] },
  { path: APP_PATH.Unsorted, canActivate: [redirectToSignIn], children: [] },
  { path: APP_PATH.Favorites, canActivate: [redirectToSignIn], children: [] },
  { path: `${APP_PATH.Folders}/:folderId`, canActivate: [redirectToSignIn], children: [] },
  { path: APP_PATH.Settings, canActivate: [redirectToSignIn], children: [] },
  // `state.url` keeps the whole query, so the shared data survives the sign-in.
  { path: APP_PATH.Share, canActivate: [redirectToSignIn], children: [] },
  {
    path: APP_PATH.SignIn,
    canMatch: [guestOnly],
    loadComponent: () => import('./features/auth/sign-in.page'),
  },
  { path: APP_PATH.SignIn, redirectTo: APP_PATH.Links },
];
