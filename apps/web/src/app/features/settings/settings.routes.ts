import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import { AI_APPLIED_PART } from '@shelfmark/contracts';
import { APP_PATH } from '../../models/app-path.const';
import { CONNECT_SEGMENT } from '../ai/connect/models/connect-segment.const';
import { CLEANUP_SEGMENT } from '../cleanup/models/cleanup-segment.const';
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
  // Library clean-up (AI-5): a page under Library on every screen size.
  {
    path: `${SETTINGS_PATH.Library}/${CLEANUP_SEGMENT}`,
    loadComponent: () => import('../cleanup/cleanup.page'),
  },
  {
    path: SETTINGS_PATH.Notifications,
    loadComponent: () => import('./pages/notifications/notifications.page'),
  },
  {
    path: SETTINGS_PATH.Ai,
    loadComponent: () => import('./pages/ai/ai-settings.page'),
  },
  // Connect your assistant (Shelf 15-tools): a page of its own under AI, phone included.
  {
    path: `${SETTINGS_PATH.Ai}/${CONNECT_SEGMENT}`,
    loadComponent: () => import('../ai/connect/connect.page'),
  },
  // Phone: the full-label choices of folder and tags mode (MobileAi state 7).
  ...Object.values(AI_APPLIED_PART).map((part) => ({
    path: `${SETTINGS_PATH.Ai}/${part}`,
    data: { part },
    loadComponent: () => import('./pages/ai-mode/ai-mode.page'),
  })),
  {
    path: SETTINGS_PATH.Language,
    loadComponent: () => import('./pages/language/language.page'),
  },
  {
    path: SETTINGS_PATH.Shortcuts,
    loadComponent: () => import('./pages/shortcuts/shortcuts.page'),
  },
  // Import and export live in Settings › Your data (Shelf); old links and bookmarks land there.
  {
    path: SETTINGS_PATH.ImportExport,
    redirectTo: () => inject(Router).createUrlTree(['/', APP_PATH.Settings, SETTINGS_PATH.Privacy]),
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
