import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { APP_PATH } from '../../models/app-path.const';
import { AdminStore } from './services/admin.store';

/** `/admin/*` is for the author: everyone else goes to the links (the API answers 404 anyway). */
export const adminOnly: CanActivateFn = async () => {
  const admin = inject(AdminStore);
  const router = inject(Router);
  if (await admin.check()) {
    return true;
  }
  return router.createUrlTree(['/', APP_PATH.Links]);
};
