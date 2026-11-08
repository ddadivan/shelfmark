import { ErrorHandler, inject } from '@angular/core';
import { MonitoringService } from './monitoring.service';

/**
 * Angular's global error handler: logs to the console like the default one, then forwards the
 * error to monitoring. Window errors and unhandled rejections arrive here through
 * `provideBrowserGlobalErrorListeners`.
 */
export class MonitoringErrorHandler implements ErrorHandler {
  private readonly monitoring = inject(MonitoringService);

  handleError(error: unknown): void {
    console.error(error);
    this.monitoring.report(error);
  }
}
