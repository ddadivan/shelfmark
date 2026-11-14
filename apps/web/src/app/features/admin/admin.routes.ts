import type { Routes } from '@angular/router';
import { ADMIN_PATH } from './models/admin-path.const';

/** Children of `/admin` (the whole subtree sits behind `adminOnly`, see `app.page-routes.ts`). */
export default [
  {
    path: ADMIN_PATH.Feedback,
    loadComponent: () => import('./pages/admin-feedback/admin-feedback.page'),
  },
  {
    path: ADMIN_PATH.Stats,
    loadComponent: () => import('./pages/admin-stats/admin-stats.page'),
  },
] satisfies Routes;
