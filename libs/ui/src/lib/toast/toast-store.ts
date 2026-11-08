import { DestroyRef, ErrorHandler, inject, Service, signal } from '@angular/core';
import { TOAST_CLOSE_REASON } from './models/toast-close-reason.const';
import type { ToastCloseReason } from './models/toast-close-reason.type';
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
  private readonly resolvers = new Map<number, (reason: ToastCloseReason) => void>();
  private nextId = 1;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private remaining = 0;
  private startedAt = 0;

  /** What to render: zero or one item. */
  readonly items = this.current.asReadonly();

  constructor() {
    // `closed` must never stay pending: settle what is left when the injector goes away.
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      this.timer = undefined;
      for (const id of [...this.resolvers.keys()]) {
        this.resolve(id, TOAST_CLOSE_REASON.Dismissed);
      }
    });
  }

  push(options: ToastOptions): ToastItem {
    const id = this.nextId++;
    const closed = new Promise<ToastCloseReason>((resolve) => this.resolvers.set(id, resolve));
    // The previous toast is settled as `replaced` before `current.set` swaps it out.
    const previous = this.current()[0];
    if (previous) {
      this.resolve(previous.id, TOAST_CLOSE_REASON.Replaced);
    }
    const item: ToastItem = {
      id,
      kind: options.kind ?? TOAST_KIND.Info,
      text: options.text,
      action: options.action,
      actionHint: options.action ? options.actionHint : undefined,
      duration: Math.max(
        0,
        options.duration ??
          (options.action ? TOAST_DURATION_MS.withAction : TOAST_DURATION_MS.default),
      ),
      closed,
    };
    this.current.set([item]);
    this.remaining = item.duration;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.start(item);
    return item;
  }

  dismiss(id: number, reason: ToastCloseReason = TOAST_CLOSE_REASON.Dismissed): void {
    if (this.current()[0]?.id !== id) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = undefined;
    this.current.set([]);
    this.resolve(id, reason);
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

  /**
   * Dismisses with `action` first, then runs the action (if any): an action that shows another
   * toast must not turn this one into `replaced`. An error goes to the `ErrorHandler`.
   */
  runAction(item: ToastItem): void {
    this.dismiss(item.id, TOAST_CLOSE_REASON.Action);
    try {
      item.action?.run();
    } catch (error) {
      this.errorHandler.handleError(error);
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
      this.dismiss(item.id, TOAST_CLOSE_REASON.Timeout);
    }, this.remaining);
  }

  /** Settles the `closed` promise of a toast once; later calls do nothing. */
  private resolve(id: number, reason: ToastCloseReason): void {
    this.resolvers.get(id)?.(reason);
    this.resolvers.delete(id);
  }
}
