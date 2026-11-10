import { computed, DestroyRef, ErrorHandler, inject, Service, signal } from '@angular/core';
import { TOAST_CLOSE_REASON } from './models/toast-close-reason.const';
import type { ToastCloseReason } from './models/toast-close-reason.type';
import type { ToastAction } from './models/toast-action.interface';
import { TOAST_DURATION_MS } from './models/toast-duration.const';
import type { ToastItem } from './models/toast-item.interface';
import { TOAST_STACK_MAX } from './models/toast-stack-max.const';
import type { ToastOptions } from './models/toast-options.interface';
import type { ToastStackEntry } from './models/toast-stack-entry.interface';
import { toastDefaultDuration } from './toast-default-duration';

/** The clock of one toast: it runs, or it waits with the time that is left. */
interface ToastClock {
  timer: ReturnType<typeof setTimeout> | undefined;
  remaining: number;
  startedAt: number;
}

/**
 * State and timers of the toasts on screen (internal; features use `ToastService`). Up to
 * `TOAST_STACK_MAX` stack, the oldest first; a newer one beyond that pushes the oldest out
 * (`replaced`). Each toast has its own timer, which pauses while that toast is hovered or
 * focused and resumes with the time that was left.
 */
@Service()
export class ToastStore {
  private readonly current = signal<readonly ToastItem[]>([]);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly resolvers = new Map<number, (reason: ToastCloseReason) => void>();
  private readonly clocks = new Map<number, ToastClock>();
  private nextId = 1;

  /** What to render, oldest first. */
  readonly items = this.current.asReadonly();
  /** The same with each toast's place in the stack (0 is the newest, in front). */
  readonly stack = computed<readonly ToastStackEntry[]>(() => {
    const items = this.current();
    return items.map((item, index) => ({ item, index, depth: items.length - 1 - index }));
  });

  constructor() {
    // `closed` must never stay pending: settle what is left when the injector goes away.
    inject(DestroyRef).onDestroy(() => {
      for (const clock of this.clocks.values()) {
        clearTimeout(clock.timer);
      }
      this.clocks.clear();
      for (const id of [...this.resolvers.keys()]) {
        this.resolve(id, TOAST_CLOSE_REASON.Dismissed);
      }
    });
  }

  push(options: ToastOptions): ToastItem {
    const id = this.nextId++;
    const closed = new Promise<ToastCloseReason>((resolve) => this.resolvers.set(id, resolve));
    // A fourth toast pushes the oldest out; it is settled as `replaced` before the swap.
    const kept = this.current().slice(-(TOAST_STACK_MAX - 1));
    for (const dropped of this.current().slice(0, this.current().length - kept.length)) {
      this.stopClock(dropped.id);
      this.resolve(dropped.id, TOAST_CLOSE_REASON.Replaced);
    }
    const duration = Math.max(
      0,
      options.duration ?? toastDefaultDuration(options.kind, !!options.action),
    );
    const item: ToastItem = {
      id,
      kind: options.kind,
      title: options.title,
      detail: options.detail,
      thumb: options.thumb,
      folder: options.folder,
      action: options.action,
      secondary: options.secondary,
      duration,
      undo: !!options.action && duration === TOAST_DURATION_MS.Undo,
      actionHint: options.action ? options.actionHint : undefined,
      closed,
    };
    this.current.set([...kept, item]);
    this.clocks.set(id, { timer: undefined, remaining: duration, startedAt: 0 });
    this.start(item);
    return item;
  }

  dismiss(id: number, reason: ToastCloseReason = TOAST_CLOSE_REASON.Dismissed): void {
    if (!this.current().some((item) => item.id === id)) {
      return;
    }
    this.stopClock(id);
    this.current.update((items) => items.filter((item) => item.id !== id));
    this.resolve(id, reason);
  }

  /** Hover or focus on a toast stops its clock; leaving restarts it with what remained. */
  setPaused(id: number, paused: boolean): void {
    const item = this.current().find((candidate) => candidate.id === id);
    const clock = this.clocks.get(id);
    if (!item || !clock) {
      return;
    }
    if (paused) {
      if (clock.timer !== undefined) {
        clearTimeout(clock.timer);
        clock.timer = undefined;
        clock.remaining = Math.max(0, clock.remaining - (Date.now() - clock.startedAt));
      }
    } else if (clock.timer === undefined) {
      this.start(item);
    }
  }

  /**
   * Dismisses with `action` first, then runs the action (if any): an action that shows another
   * toast must not turn this one into `replaced`. An error goes to the `ErrorHandler`.
   */
  runAction(item: ToastItem, action: ToastAction | undefined = item.action): void {
    this.dismiss(item.id, TOAST_CLOSE_REASON.Action);
    try {
      action?.run();
    } catch (error) {
      this.errorHandler.handleError(error);
    }
  }

  /** Duration 0 means no timer: the toast stays until it is dismissed. */
  private start(item: ToastItem): void {
    const clock = this.clocks.get(item.id);
    if (!clock) {
      return;
    }
    clearTimeout(clock.timer);
    clock.timer = undefined;
    if (item.duration === 0) {
      return;
    }
    clock.startedAt = Date.now();
    clock.timer = setTimeout(() => {
      clock.timer = undefined;
      this.dismiss(item.id, TOAST_CLOSE_REASON.Timeout);
    }, clock.remaining);
  }

  private stopClock(id: number): void {
    clearTimeout(this.clocks.get(id)?.timer);
    this.clocks.delete(id);
  }

  /** Settles the `closed` promise of a toast once; later calls do nothing. */
  private resolve(id: number, reason: ToastCloseReason): void {
    this.resolvers.get(id)?.(reason);
    this.resolvers.delete(id);
  }
}
