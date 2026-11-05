import { isDevMode } from '@angular/core';
import { TranslocoOptions } from '@jsverse/transloco';

export const translocoConfig: TranslocoOptions['config'] = {
  availableLangs: ['en'],
  defaultLang: 'en',
  reRenderOnLangChange: true,
  fallbackLang: 'en',
  failedRetries: 0,
  prodMode: !isDevMode(),
  missingHandler: { logMissingKey: isDevMode(), useFallbackTranslation: false },
};
