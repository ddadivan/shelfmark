import type { AiBackgroundTask } from '../src/ai/models/ai-background-task.type';

/**
 * Test double for `AiBackgroundService`: deferred tasks wait until the spec calls `flush()`, which
 * runs them (and whatever they defer in turn) in order and rethrows the first failure. Lets a spec
 * decide exactly when "after the response" happens.
 */
export class AwaitableDeferrer {
  private readonly queue: AiBackgroundTask[] = [];

  defer(task: AiBackgroundTask): void {
    this.queue.push(task);
  }

  get size(): number {
    return this.queue.length;
  }

  async flush(): Promise<void> {
    for (let task = this.queue.shift(); task !== undefined; task = this.queue.shift()) {
      await task();
    }
  }

  clear(): void {
    this.queue.length = 0;
  }
}
