import { Routes } from '@angular/router';
import { notFoundRoute, pageRoutes } from './app.page-routes';

// The `e2e` build configuration replaces this file with `app.routes.e2e.ts` (project.json).
export const appRoutes: Routes = [...pageRoutes, notFoundRoute];
