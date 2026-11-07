import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withRouterConfig,
} from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { apiBaseInterceptor } from './core/api/api-base.interceptor';
import { appRoutes } from './app.routes';
import { translocoConfig } from './core/i18n/transloco.config';
import { AppTranslocoLoader } from './core/i18n/app-transloco.loader';
import { ThemeService } from './core/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withPreloading(PreloadAllModules),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    // Order matters (PROJECT.md 5.1): apiBase, requestId, retry, loading, error, devLogging.
    // Only the first exists so far; add the others in that order.
    provideHttpClient(withFetch(), withInterceptors([apiBaseInterceptor])),
    provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
    provideAppInitializer(() => inject(ThemeService).init()),
  ],
};
