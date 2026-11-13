import type { DialogRef } from '@angular/cdk/dialog';
import { afterNextRender, signal, type Injector } from '@angular/core';
import { ReplaySubject, type Observable } from 'rxjs';
import { markFocusReturn } from './focus-return';

/** Longest leave animation (the 200 ms sheet exit) plus a margin; never wait longer. */
const LEAVE_TIMEOUT_MS = 400;

/**
 * Handle of an open dialog. `close(result)` plays the leave animation and then removes the
 * overlay (focus returns to the trigger at that point); a second call is ignored.
 * Esc, the scrim and the sheet drag all go through it, so every path animates the same way.
 * `setLocked(true)` turns those user dismissals off until it is released.
 */
export class UiDialogRef<R = undefined, C = unknown> {
  /** True from the first `close()` until the overlay is removed. */
  readonly leaving = signal(false);

  private readonly lockedState = signal(false);
  /**
   * True while the content holds the dialog open (a request in flight): Esc, the scrim, the close
   * button and the sheet drag do nothing. `close()` from code still closes, and so does the CDK
   * (navigation, `closeAll` on sign-out).
   */
  readonly locked = this.lockedState.asReadonly();

  private readonly closedSubject = new ReplaySubject<R | undefined>(1);
  private closing = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  /** Resolves with the result (`undefined` when dismissed) once the dialog is gone. */
  readonly result: Promise<R | undefined> = new Promise((resolve) => {
    this.closedSubject.subscribe({ next: resolve });
  });

  constructor(
    private readonly cdkRef: DialogRef<R, C>,
    private readonly injector: Injector,
  ) {
    // Also fires when the CDK closes the dialog itself (navigation, `closeAll`, destroy).
    cdkRef.closed.subscribe((result) => {
      this.closing = true;
      this.timers.forEach((timer) => {
        clearTimeout(timer);
      });
      this.timers = [];
      this.closedSubject.next(result);
      this.closedSubject.complete();
    });
  }

  /** The content component; `null` after the dialog closed. */
  get componentInstance(): C | null {
    return this.cdkRef.componentInstance;
  }

  get id(): string {
    return this.cdkRef.id;
  }

  get isClosing(): boolean {
    return this.closing;
  }

  /** The CDK host element (stacking context, carries `ui-overlay-layer--dialog`). */
  get hostElement(): HTMLElement {
    return this.cdkRef.overlayRef.hostElement;
  }

  /** Emits the result once, after the overlay is removed (also to late subscribers). */
  afterClosed(): Observable<R | undefined> {
    return this.closedSubject.asObservable();
  }

  /** Holds the dialog open against every dismissal by the user (see `locked`), or releases it. */
  setLocked(locked: boolean): void {
    this.lockedState.set(locked);
  }

  close(result?: R): void {
    if (this.closing) {
      return;
    }
    this.closing = true;
    this.leaving.set(true);
    // Fades the scrim out right away; the panel plays its own leave animation.
    this.cdkRef.overlayRef.detachBackdrop();
    // No render may follow (content that does not read `leaving`), so a timer closes anyway.
    const safety = setTimeout(() => {
      markFocusReturn();
      this.cdkRef.close(result);
    }, LEAVE_TIMEOUT_MS * 2);
    this.timers.push(safety);
    const finish = (): void => {
      markFocusReturn();
      this.cdkRef.close(result);
    };
    afterNextRender(
      () => {
        const pane = this.cdkRef.overlayRef.overlayElement;
        const animations = pane.getAnimations?.({ subtree: true }) ?? [];
        if (animations.length === 0) {
          finish();
          return;
        }
        const fallback = new Promise<void>((resolve) => {
          this.timers.push(setTimeout(resolve, LEAVE_TIMEOUT_MS));
        });
        void Promise.race([
          Promise.allSettled(animations.map((animation) => animation.finished)),
          fallback,
        ]).then(finish);
      },
      { injector: this.injector },
    );
  }
}
