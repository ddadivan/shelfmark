import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { ReducedMotion } from '@shelfmark/ui';
import { FIRST_SETTLE } from './models/first-settle.const';

/**
 * One-time settle of the main column (#562, Motion «First load settle», an exception to principle
 * 1 that the author decides on): while the first page of this app load renders, the host (the
 * shell's `main`) carries `FIRST_SETTLE.Class`, under which the page's top-level blocks fade in
 * 60 ms apart (`styles.scss`, fade only, nothing on scroll). Once the first page element is in
 * the host (a `MutationObserver`; lazy routes render later than the shell) the class goes when
 * those fades have finished (a busy boot can hold their clock at 0, so no fixed timer cuts them),
 * so later pages never animate; `FIRST_SETTLE.MaxMs` is the safety net, and without Web
 * Animations `FIRST_SETTLE.HoldMs` after the page appeared. Nothing under reduced motion or the Animations setting.
 */
@Directive({ selector: '[appFirstSettle]' })
export class FirstSettleDirective {
  constructor() {
    if (inject(ReducedMotion).reduced()) {
      return;
    }
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const view = inject(DOCUMENT).defaultView;
    host.classList.add(FIRST_SETTLE.Class);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (): void => {
      host.classList.remove(FIRST_SETTLE.Class);
    };
    const hold = (delay: number): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(finish, delay);
    };
    const pages = (): Element[] =>
      Array.from(host.children).filter((child) => child.tagName !== 'ROUTER-OUTLET');
    const settleWhenDone = (): void => {
      const blocks = pages().flatMap((page) => Array.from(page.children));
      const animations = blocks.flatMap((block) =>
        typeof block.getAnimations === 'function' ? block.getAnimations() : [],
      );
      if (animations.length === 0) {
        hold(FIRST_SETTLE.HoldMs);
        return;
      }
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(finish);
    };
    hold(FIRST_SETTLE.MaxMs);
    let observer: MutationObserver | null = null;
    if (pages().length > 0 || typeof view?.MutationObserver !== 'function') {
      settleWhenDone();
    } else {
      observer = new view.MutationObserver(() => {
        if (pages().length > 0) {
          observer?.disconnect();
          settleWhenDone();
        }
      });
      observer.observe(host, { childList: true });
    }
    inject(DestroyRef).onDestroy(() => {
      observer?.disconnect();
      if (timer !== null) {
        clearTimeout(timer);
      }
    });
  }
}
