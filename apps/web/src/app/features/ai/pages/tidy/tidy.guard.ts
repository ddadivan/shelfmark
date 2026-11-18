import { inject, Injector } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { APP_PATH } from '../../../../models/app-path.const';

/**
 * Tidy Unsorted only while AI is on (read once); otherwise Unsorted. The AI store is loaded
 * lazily, so the route table keeps no AI code in the first bundle.
 */
export const tidyAiOn: CanActivateFn = async () => {
  const injector = inject(Injector);
  const router = inject(Router);
  const { AiSettingsStore } = await import('../../services/ai-settings.store');
  const settings = injector.get(AiSettingsStore);
  await settings.load();
  return settings.isOn() || router.createUrlTree([`/${APP_PATH.Unsorted}`]);
};
