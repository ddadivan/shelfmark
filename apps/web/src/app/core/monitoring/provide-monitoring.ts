import {
  ErrorHandler,
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { MonitoringErrorHandler } from './monitoring-error-handler';
import { MonitoringService } from './monitoring.service';
import { runWhenIdle } from './run-when-idle';

/**
 * Error monitoring (Sentry, ADR 0032): the error handler plus a start scheduled for browser idle
 * time. The app initializer does not wait for it, so startup is never delayed.
 */
export function provideMonitoring(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ErrorHandler, useClass: MonitoringErrorHandler },
    provideAppInitializer(() => {
      const monitoring = inject(MonitoringService);
      runWhenIdle(() => void monitoring.start());
    }),
  ]);
}
