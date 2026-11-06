import { ErrorHandler, inject, Service, signal } from '@angular/core';
import { TOAST_DURATION_MS } from './models/toast-duration.const';
import type { ToastItem } from './models/toast-item.interface';
import type { ToastOptions } from './models/toast-options.interface';
import { TOAST_KIND } from './models/toast-kind.const';

/**
 * State and timer of the toast on screen (internal; features use `ToastService`). One toast at
 * a time: a newer one replaces the older. The timer pauses while the toast is hovered or
 * focused and resumes with the time that was left.
 */
@Service()
export class ToastStore {
  private readonly current = signal<readonly ToastItem[]>([]);
  private readonly errorHandler = inject(ErrorHandler);
  private nextId = 1;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private remaining = 0;
  private startedAt = 0;

  /** What to render: zero or one item. */
  readonly items = this.current.asReadonly();

  push(options: ToastOptions): ToastItem {
    const item: ToastItem = {
      id: this.nextId++,
      kind: options.kind ?? TOAST_KIND.Info,
      text: options.text,
      action: options.action,
      duration: Math.max(
        0,
        options.duration ??
          (options.action ? TOAST_DURATION_MS.withAction : TOAST_DURATION_MS.default),
      ),
    };
    this.current.set([item]);
    this.remaining = item.duration;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.start(item);
    return item;
  }

  dismiss(id: number): void {
    if (this.current()[0]?.id !== id) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = undefined;
    this.current.set([]);
  }

  /** Hover or focus on the toast stops the clock; leaving restarts it with what remained. */
  setPaused(id: number, paused: boolean): void {
    if (this.current()[0]?.id !== id) {
      return;
    }
    if (paused) {
      if (this.timer !== undefined) {
        clearTimeout(this.timer);
        this.timer = undefined;
        this.remaining = Math.max(0, this.remaining - (Date.now() - this.startedAt));
      }
    } else if (this.timer === undefined) {
      this.start(this.current()[0]);
    }
  }

  /** Runs the action (if any), then dismisses. An error goes to the `ErrorHandler`. */
  runAction(item: ToastItem): void {
    try {
      item.action?.run();
    } catch (error) {
      this.errorHandler.handleError(error);
    } finally {
      this.dismiss(item.id);
    }
  }

  /** Duration 0 means no timer: the toast stays until it is dismissed. */
  private start(item: ToastItem): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (item.duration === 0) {
      return;
    }
    this.startedAt = Date.now();
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.dismiss(item.id);
    }, this.remaining);
  }
}
