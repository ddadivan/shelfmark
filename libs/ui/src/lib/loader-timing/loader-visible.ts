import {
  DestroyRef,
  effect,
  inject,
  Injector,
  signal,
  untracked,
  type Signal,
} from '@angular/core';
import { LOADER_MIN_VISIBLE_MS } from './models/loader-min-visible.const';
import { LOADER_SHOW_DELAY_MS } from './models/loader-show-delay.const';
import type { LoaderTimingOptions } from './models/loader-timing-options.interface';

/**
 * Loader timing (Loading spec): turns a `busy` signal into a `visible` signal that goes true
 * only after the wait lasted `delay` ms (300) and, once true, stays true for at least
 * `minVisible` ms (400). A response faster than the delay never shows a loader; a busy period
 * that restarts while the loader is still held keeps it visible. Pure: timers and signals
 * only, no HTTP. Call it in an injection context (a field initialiser, a constructor) or pass
 * `injector`; the timers are cleared when that context is destroyed.
 */
export function loaderVisible(
  busy: Signal<boolean>,
  options: LoaderTimingOptions = {},
): Signal<boolean> {
  const delay = options.delay ?? LOADER_SHOW_DELAY_MS;
  const minVisible = options.minVisible ?? LOADER_MIN_VISIBLE_MS;
  const injector = options.injector ?? inject(Injector);
  const visible = signal(false);

  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let shownAt = 0;

  const clearShow = (): void => {
    clearTimeout(showTimer);
    showTimer = undefined;
  };
  const clearHide = (): void => {
    clearTimeout(hideTimer);
    hideTimer = undefined;
  };
  const show = (): void => {
    showTimer = undefined;
    shownAt = Date.now();
    visible.set(true);
  };
  const hide = (): void => {
    hideTimer = undefined;
    visible.set(false);
  };

  effect(
    () => {
      const isBusy = busy();
      untracked(() => {
        if (isBusy) {
          clearHide();
          if (!visible() && showTimer === undefined) {
            showTimer = setTimeout(show, delay);
          }
        } else {
          clearShow();
          if (visible() && hideTimer === undefined) {
            const remaining = minVisible - (Date.now() - shownAt);
            if (remaining > 0) {
              hideTimer = setTimeout(hide, remaining);
            } else {
              hide();
            }
          }
        }
      });
    },
    { injector },
  );

  injector.get(DestroyRef).onDestroy(() => {
    clearShow();
    clearHide();
  });

  return visible.asReadonly();
}
