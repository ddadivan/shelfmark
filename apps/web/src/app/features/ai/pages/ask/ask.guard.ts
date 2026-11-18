import { inject, Injector } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { APP_PATH } from '../../../../models/app-path.const';

/**
 * The full-screen Ask page only while Ask is on (read once); otherwise the Library tab. The AI
 * store is loaded lazily, so the route table keeps no AI code in the first bundle.
 */
export const askOnGuard: CanActivateFn = async () => {
  const injector = inject(Injector);
  const router = inject(Router);
  const { AiSettingsStore } = await import('../../services/ai-settings.store');
  const settings = injector.get(AiSettingsStore);
  await settings.load();
  return settings.askOn() || router.createUrlTree([`/${APP_PATH.Library}`]);
};
