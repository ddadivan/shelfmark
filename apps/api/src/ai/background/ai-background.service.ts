import { Injectable, Logger } from '@nestjs/common';
import { waitUntil } from '@vercel/functions';
import type { AiBackgroundTask } from '../models/ai-background-task.type';

/**
 * Runs AI work after the response (ADR 0048 point 2). On Vercel `waitUntil` keeps the instance alive
 * until the task settles (within `maxDuration`); anywhere else it does nothing and the promise simply
 * runs in the Node process. A failure is logged by its error name only (never content) and never
 * reaches the request. Tests replace this service with a deferrer they can await.
 */
@Injectable()
export class AiBackgroundService {
  private readonly logger = new Logger(AiBackgroundService.name);

  defer(task: AiBackgroundTask): void {
    const promise = Promise.resolve()
      .then(task)
      .catch((error: unknown) => {
        this.logger.error(
          `AI background task failed (${error instanceof Error ? error.name : 'unknown'})`,
        );
      });
    waitUntil(promise);
  }
}
