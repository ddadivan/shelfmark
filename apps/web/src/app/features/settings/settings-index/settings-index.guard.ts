import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { ViewportService } from '../../../core/layout/viewport.service';
import { APP_PATH } from '../../../models/app-path.const';
import { SETTINGS_PATH } from '../models/settings-path.const';

/**
 * `/settings` is the You list on a phone. Tablet and desktop have the settings nav beside the
 * page, so there it goes to the first section.
 */
export const settingsIndexGuard: CanActivateFn = () => {
  if (inject(ViewportService).compact()) {
    return true;
  }
  return inject(Router).createUrlTree(['/', APP_PATH.Settings, SETTINGS_PATH.Account]);
};
