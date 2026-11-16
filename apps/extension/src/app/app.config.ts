import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { credentialsInterceptor } from './core/api/credentials.interceptor';
import { ExtTranslocoLoader } from './core/i18n/ext-transloco.loader';
import { EXT_LANG } from './core/i18n/models/ext-lang.const';
import { resolveExtLang } from './core/i18n/resolve-ext-lang';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch(), withInterceptors([credentialsInterceptor])),
    provideTransloco({
      config: {
        availableLangs: Object.values(EXT_LANG),
        defaultLang: EXT_LANG.En,
        fallbackLang: EXT_LANG.En,
        reRenderOnLangChange: false,
        failedRetries: 0,
        prodMode: true,
        missingHandler: { logMissingKey: false, useFallbackTranslation: false },
      },
      loader: ExtTranslocoLoader,
    }),
    // The language file loads before the first render, so no key ever flashes.
    provideAppInitializer(async () => {
      const transloco = inject(TranslocoService);
      const lang = resolveExtLang(navigator.languages);
      document.documentElement.lang = lang;
      transloco.setActiveLang(lang);
      await firstValueFrom(transloco.load(lang));
    }),
  ],
};
