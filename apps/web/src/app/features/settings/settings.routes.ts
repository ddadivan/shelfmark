import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import { APP_PATH } from '../../models/app-path.const';
import { YOUR_DATA_FRAGMENT } from './models/your-data-fragment.const';
import { SETTINGS_PATH } from './models/settings-path.const';
import { settingsIndexGuard } from './pages/settings-index/settings-index.guard';

/** Children of `/settings`: the You list (phone) and one page per section. */
export default [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [settingsIndexGuard],
    loadComponent: () => import('./pages/settings-index/settings-index.page'),
  },
  {
    path: SETTINGS_PATH.Account,
    loadComponent: () => import('./pages/account/account.page'),
  },
  {
    path: SETTINGS_PATH.Appearance,
    loadComponent: () => import('./pages/appearance/appearance.page'),
  },
  {
    path: SETTINGS_PATH.Library,
    loadComponent: () => import('./pages/library/library.page'),
  },
  {
    path: SETTINGS_PATH.Language,
    loadComponent: () => import('./pages/language/language.page'),
  },
  {
    path: SETTINGS_PATH.Shortcuts,
    loadComponent: () => import('./pages/shortcuts/shortcuts.page'),
  },
  // Export moved to Account › Your data (#352); old links and bookmarks land there.
  {
    path: SETTINGS_PATH.ImportExport,
    redirectTo: () =>
      inject(Router).createUrlTree(['/', APP_PATH.Settings, SETTINGS_PATH.Account], {
        fragment: YOUR_DATA_FRAGMENT,
      }),
  },
  {
    path: SETTINGS_PATH.Privacy,
    loadComponent: () => import('./pages/privacy-data/privacy-data.page'),
  },
  {
    path: SETTINGS_PATH.Feedback,
    loadComponent: () => import('./pages/your-feedback/your-feedback.page'),
  },
] satisfies Routes;
