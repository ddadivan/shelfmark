import type { Routes } from '@angular/router';
import { SETTINGS_PATH } from './models/settings-path.const';
import { settingsIndexGuard } from './settings-index/settings-index.guard';

/** Children of `/settings`: the You list (phone) and one page per section. */
export default [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [settingsIndexGuard],
    loadComponent: () => import('./settings-index/settings-index.page'),
  },
  {
    path: SETTINGS_PATH.Account,
    loadComponent: () => import('./account/account.page'),
  },
  {
    path: SETTINGS_PATH.Appearance,
    loadComponent: () => import('./appearance/appearance.page'),
  },
  {
    path: SETTINGS_PATH.Library,
    loadComponent: () => import('./library/library.page'),
  },
  {
    path: SETTINGS_PATH.Language,
    loadComponent: () => import('./language/language.page'),
  },
  {
    path: SETTINGS_PATH.Shortcuts,
    loadComponent: () => import('./shortcuts/shortcuts.page'),
  },
  {
    path: SETTINGS_PATH.ImportExport,
    loadComponent: () => import('./import-export/import-export.page'),
  },
  {
    path: SETTINGS_PATH.Privacy,
    loadComponent: () => import('./privacy-data/privacy-data.page'),
  },
] satisfies Routes;
