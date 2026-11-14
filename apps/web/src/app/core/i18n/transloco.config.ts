import { isDevMode } from '@angular/core';
import { TranslocoOptions } from '@jsverse/transloco';
import { APP_LANG } from './models/app-lang.const';

export const translocoConfig: TranslocoOptions['config'] = {
  availableLangs: Object.values(APP_LANG),
  defaultLang: APP_LANG.En,
  reRenderOnLangChange: true,
  fallbackLang: APP_LANG.En,
  failedRetries: 0,
  prodMode: !isDevMode(),
  missingHandler: { logMissingKey: isDevMode(), useFallbackTranslation: false },
};
