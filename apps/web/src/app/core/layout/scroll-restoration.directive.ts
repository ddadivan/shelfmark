import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Injector,
} from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { RESTORE_SCROLL_TIMEOUT_MS } from './models/restore-scroll-timeout-ms.const';
import { SCROLL_POSITIONS_MAX } from './models/scroll-positions-max.const';
import { USER_SCROLL_EVENTS } from './models/user-scroll-events.const';
import { urlWithoutFragment } from './url-without-fragment';

/** The `navigationId` the router keeps in `history.state`, if any. */
function navigationIdOf(state: unknown): number {
  if (typeof state === 'object' && state !== null && 'navigationId' in state) {
    const id = (state as { navigationId: unknown }).navigationId;
    return typeof id === 'number' ? id : 0;
  }
  return 0;
}

/**
 * Scroll restoration for the host, the app shell's main column (#352). The shell scrolls this
 * column instead of the document, so the router's own restoration (which only moves the window)
 * does nothing here. Like it, the position is stored per navigation id when a navigation starts:
 *
 * - Back / Forward (a `popstate` navigation to a stored entry) puts that position back once the
 *   page has rendered, and holds it while the page settles (the list loads after the page, the
 *   previous page leaves) until the user scrolls or `RESTORE_SCROLL_TIMEOUT_MS` passes.
 * - Any other navigation to a new URL starts at the top: another page, and a new query (sort,
 *   filters) too. A change of the fragment alone keeps the position.
 */
@Directive({ selector: '[appScrollRestoration]' })
export class ScrollRestorationDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly positions = new Map<number, number>();
  private lastId = navigationIdOf(inject(Location).getState());
  private restoredId: number | null = null;
  private stopRestoring: (() => void) | null = null;

  constructor() {
    const router = inject(Router);
    let url = urlWithoutFragment(router.url);
    const subscription = router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.remember(this.lastId, this.host.scrollTop);
        this.restoredId =
          event.navigationTrigger === 'popstate'
            ? (event.restoredState?.navigationId ?? null)
            : null;
      } else if (event instanceof NavigationEnd) {
        this.lastId = event.id;
        const next = urlWithoutFragment(event.urlAfterRedirects);
        const changed = next !== url;
        url = next;
        const saved = this.restoredId === null ? undefined : this.positions.get(this.restoredId);
        this.restoredId = null;
        if (saved !== undefined) {
          this.restore(saved);
        } else if (changed) {
          this.cancel();
          this.host.scrollTop = 0;
        }
      }
    });
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      this.cancel();
    });
  }

  private remember(id: number, top: number): void {
    this.positions.delete(id);
    this.positions.set(id, top);
    if (this.positions.size > SCROLL_POSITIONS_MAX) {
      const [oldest] = this.positions.keys();
      this.positions.delete(oldest);
    }
  }

  /**
   * Scrolls to `top` after the next render, then holds it there while the page settles: every
   * change in the content (the list arriving, the previous page leaving, which the browser's
   * scroll anchoring would otherwise answer by moving the position) puts it back in the next
   * frame, until the user scrolls or `RESTORE_SCROLL_TIMEOUT_MS` passes.
   */
  private restore(top: number): void {
    this.cancel();
    const host = this.host;
    const view = host.ownerDocument.defaultView;
    let frame = 0;
    const apply = (): void => {
      frame = 0;
      if (host.scrollTop !== top) {
        host.scrollTop = top;
      }
    };
    const observer = new MutationObserver(() => {
      if (!frame) {
        frame = view?.requestAnimationFrame(apply) ?? 0;
      }
    });
    const stopOnUser = (): void => this.cancel();
    const timer = setTimeout(stopOnUser, RESTORE_SCROLL_TIMEOUT_MS);
    const stop = (): void => {
      observer.disconnect();
      clearTimeout(timer);
      if (frame) {
        view?.cancelAnimationFrame(frame);
      }
      for (const type of USER_SCROLL_EVENTS) {
        host.removeEventListener(type, stopOnUser);
      }
    };
    this.stopRestoring = stop;
    observer.observe(host, { childList: true, subtree: true });
    for (const type of USER_SCROLL_EVENTS) {
      host.addEventListener(type, stopOnUser, { passive: true });
    }
    afterNextRender(
      () => {
        if (this.stopRestoring === stop) {
          apply();
        }
      },
      { injector: this.injector },
    );
  }

  private cancel(): void {
    this.stopRestoring?.();
    this.stopRestoring = null;
  }
}
