import type {
  ConnectedOverlayPositionChange,
  FlexibleConnectedPositionStrategy,
  OverlayRef,
} from '@angular/cdk/overlay';
import { DomPortal, type ComponentPortal } from '@angular/cdk/portal';
import { afterNextRender, DestroyRef, type ComponentRef, type Injector } from '@angular/core';
import { Subscription, type Observable } from 'rxjs';
import { connectedSide, setOverlayOrigin } from './overlay-origin';
import type { OverlaySide } from './models/overlay-side.type';

/** Longest leave animation (`duration-base`, 200 ms, for sheets) plus a margin. */
const LEAVE_TIMEOUT_MS = 400;

/**
 * One connected overlay (tooltip, later menu and listbox). It wraps the CDK `OverlayRef` and
 * adds what Shelfmark needs on top: `--ui-origin` follows the resolved position, the pane
 * waits for leave animations before it detaches, and everything is released on `dispose()`.
 */
export class ConnectedOverlay {
  private readonly subscription = new Subscription();
  private releaseId = 0;
  private leaveTimer: ReturnType<typeof setTimeout> | undefined;
  private lastSide: OverlaySide | undefined;
  private disposed = false;
  private readonly unregisterDestroy: () => void;

  constructor(
    private readonly overlayRef: OverlayRef,
    strategy: FlexibleConnectedPositionStrategy,
    private readonly injector: Injector,
    onPositionChange?: (side: OverlaySide) => void,
  ) {
    this.subscription.add(
      strategy.positionChanges.subscribe((change: ConnectedOverlayPositionChange) => {
        setOverlayOrigin(overlayRef.overlayElement, change.connectionPair);
        const side = connectedSide(change.connectionPair);
        this.lastSide = side;
        onPositionChange?.(side);
      }),
    );
    // Always release, even if the owner forgets `dispose()`.
    this.unregisterDestroy = this.injector.get(DestroyRef).onDestroy(() => {
      this.dispose();
    });
  }

  /** The pane element (outside view encapsulation); `--ui-origin` is set on it. */
  get pane(): HTMLElement {
    return this.overlayRef.overlayElement;
  }

  /** The CDK host (bounding box): the stacking context that carries the layer class. */
  get host(): HTMLElement {
    return this.overlayRef.hostElement;
  }

  get isAttached(): boolean {
    return this.overlayRef.hasAttached();
  }

  /** The side the panel last resolved to, after a flip. */
  get side(): OverlaySide | undefined {
    return this.lastSide;
  }

  /** Attaches a component (or returns the existing one if it is still attached). */
  attach<T>(portal: ComponentPortal<T>): ComponentRef<T> {
    this.cancelRelease();
    return this.overlayRef.attach(portal);
  }

  /**
   * Moves an existing element into the pane (a component that owns its host element, like
   * `ui-menu`). The CDK puts it back where it was on `detach()`.
   */
  attachElement(element: HTMLElement): void {
    this.cancelRelease();
    this.overlayRef.attach(new DomPortal(element));
  }

  /** Emits after the pane content has been detached (after a `release()` or `detach()`). */
  detachments(): Observable<void> {
    return this.overlayRef.detachments();
  }

  /** Recomputes the position (content size or trigger moved). */
  updatePosition(): void {
    this.overlayRef.updatePosition();
  }

  /** Stops a pending `release()`: the content came back before its leave animation ended. */
  cancelRelease(): void {
    this.releaseId++;
    clearTimeout(this.leaveTimer);
  }

  /**
   * Detaches once the leave animations on the pane have finished (the owner has already
   * removed the animated content, so `animate.leave` is running). With no animations
   * (reduced motion removes them, jsdom has none) it detaches right away. `cancelRelease()`
   * or a new `attach()` makes it a no-op, so a second open mid-animation just works.
   */
  release(): void {
    const id = ++this.releaseId;
    afterNextRender(
      () => {
        if (id !== this.releaseId) {
          return;
        }
        const animations = this.pane.getAnimations?.({ subtree: true }) ?? [];
        if (animations.length === 0) {
          this.detach();
          return;
        }
        // Never wait forever: a cancelled or never-started animation must not keep the pane.
        const fallback = new Promise<void>((resolve) => {
          this.leaveTimer = setTimeout(resolve, LEAVE_TIMEOUT_MS);
        });
        void Promise.race([
          Promise.allSettled(animations.map((animation) => animation.finished)),
          fallback,
        ]).then(() => {
          if (id === this.releaseId) {
            this.detach();
          }
        });
      },
      { injector: this.injector },
    );
  }

  /** Detaches right away. */
  detach(): void {
    this.cancelRelease();
    if (this.overlayRef.hasAttached()) {
      this.overlayRef.detach();
    }
  }

  /** Detaches and removes the pane from the DOM. */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.unregisterDestroy();
    this.cancelRelease();
    this.subscription.unsubscribe();
    this.overlayRef.dispose();
  }
}
