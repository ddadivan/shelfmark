import { Service, signal } from '@angular/core';
import { TOAST_DURATION_MS } from './models/toast-duration.const';
import type { ToastItem } from './models/toast-item.interface';
import type { ToastOptions } from './models/toast-options.interface';

/**
 * State and timer of the toast on screen (internal; features use `ToastService`). One toast at
 * a time: a newer one replaces the older. The timer pauses while the toast is hovered or
 * focused and resumes with the time that was left.
 */
@Service()
export class ToastStore {
  private readonly current = signal<readonly ToastItem[]>([]);
  private nextId = 1;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private remaining = 0;
  private startedAt = 0;

  /** What to render: zero or one item. */
  readonly items = this.current.asReadonly();

  push(options: ToastOptions): ToastItem {
    const item: ToastItem = {
      id: this.nextId++,
      kind: options.kind ?? 'info',
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
    this.start(item.id);
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
      this.start(id);
    }
  }

  /** Runs the action (if any), then dismisses, even if the action throws. */
  runAction(item: ToastItem): void {
    try {
      item.action?.run();
    } finally {
      this.dismiss(item.id);
    }
  }

  private start(id: number): void {
    clearTimeout(this.timer);
    this.startedAt = Date.now();
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.dismiss(id);
    }, this.remaining);
  }
}
