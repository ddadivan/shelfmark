import { firstValueFrom } from 'rxjs';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideRouter,
  RouteReuseStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { apiBaseInterceptor } from './core/api/api-base.interceptor';
import { errorInterceptor } from './core/api/error.interceptor';
import { provideAuthApi } from './core/auth/provide-auth-api';
import { appRoutes } from './app.routes';
import { translocoConfig } from './core/i18n/transloco.config';
import { APP_LANG } from './core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from './core/i18n/app-transloco.loader';
import { LibraryRouteReuseStrategy } from './core/routing/library-route-reuse.strategy';
import { skipViewTransitionOnReducedMotion } from './core/routing/skip-view-transition-on-reduced-motion';
import { SignedInPreloadingStrategy } from './core/routing/signed-in-preloading.strategy';
import { provideLinksApi } from './features/links/provide-links-api';
import { provideMonitoring } from './core/monitoring/provide-monitoring';
import { provideAccountDeletionApi } from './features/account-deletion/provide-account-deletion-api';
import { provideOnboardingApi } from './features/onboarding/provide-onboarding-api';
import { provideRatingApi } from './features/rating/provide-rating-api';
import { TOAST_DISMISS_LABEL } from '@shelfmark/ui';
import { ThemeService } from './core/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideMonitoring(),
    provideZonelessChangeDetection(),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      // Only for a signed-in user: a guest on the landing must not compete with the first paint.
      withPreloading(SignedInPreloadingStrategy),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      // A short root cross-fade between pages (styles.scss); skipped with reduced motion. The old
      // page stays on screen until the new one is rendered, so no empty frame shows in between.
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: skipViewTransitionOnReducedMotion,
      }),
    ),
    { provide: RouteReuseStrategy, useClass: LibraryRouteReuseStrategy },
    // Order matters (PROJECT.md 5.1): apiBase, requestId, retry, loading, error, devLogging.
    // Only apiBase and error exist so far; requestId, retry and loading go between them, devLogging last.
    provideHttpClient(withFetch(), withInterceptors([apiBaseInterceptor, errorInterceptor])),
    provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
    // Load the default language before the first render: a lazy `en.json` arriving later fills
    // in empty text and shifts the layout (CLS).
    provideAppInitializer(() => firstValueFrom(inject(TranslocoService).load(APP_LANG.En))),
    // The close button of a toast is named in the active language.
    {
      provide: TOAST_DISMISS_LABEL,
      useFactory: () => {
        const transloco = inject(TranslocoService);
        return () => transloco.translate('toast.dismiss');
      },
    },
    provideAuthApi(),
    ...provideLinksApi(),
    provideAccountDeletionApi(),
    provideOnboardingApi(),
    provideRatingApi(),
    // SwUpdate is not wired: a new version is applied on the next navigation, with no prompt.
    // App shell and static assets only; the worker never touches /api (apps/web/ngsw-config.json).
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => inject(ThemeService).init()),
  ],
};
