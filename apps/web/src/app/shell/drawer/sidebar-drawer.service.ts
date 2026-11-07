import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { DestroyRef, Service, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { KEYBOARD_KEY, OVERLAY_LAYER, overlayLayerClass, setOverlayLayer } from '@shelfmark/ui';
import { filter } from 'rxjs';
import { SidebarDrawerComponent } from './sidebar-drawer.component';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Opens the library sidebar as a drawer from the left edge on a phone.
 *
 * Choice: the CDK `Dialog` directly (not `ui-dialog`, which is a centred dialog / bottom sheet,
 * and `libs/ui` has no side drawer yet). The CDK gives the focus trap, focus restore to the
 * opener, `aria-modal` and the scroll lock; the scrim and layer classes are the dialog ones from
 * `libs/ui`. Esc, the scrim and the close button close it with a slide-out; a finished
 * navigation closes it at once.
 */
@Service()
export class SidebarDrawerService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly transloco = inject(TranslocoService);

  private ref: DialogRef<void, SidebarDrawerComponent> | undefined;
  private readonly openState = signal(false);
  /** The drawer is on screen (for `aria-expanded` of the opener). */
  readonly isOpen = this.openState.asReadonly();

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.close());
  }

  open(): void {
    if (this.ref) {
      return;
    }
    const ref = this.dialog.open<void, unknown, SidebarDrawerComponent>(SidebarDrawerComponent, {
      role: 'dialog',
      ariaModal: true,
      ariaLabel: this.transloco.translate('shell.drawer.label'),
      autoFocus: 'first-tabbable',
      disableClose: true,
      closeOnNavigation: false,
      width: '19.5rem',
      maxWidth: 'calc(100vw - 3rem)',
      height: '100dvh',
      backdropClass: ['ui-dialog-scrim', overlayLayerClass(OVERLAY_LAYER.Dialog)],
      positionStrategy: this.overlay.position().global().left('0').top('0'),
    });
    this.ref = ref;
    this.openState.set(true);
    setOverlayLayer(ref.overlayRef.hostElement, OVERLAY_LAYER.Dialog);

    ref.componentInstance?.closeRequested.subscribe(() => this.close({ animated: true }));
    ref.componentInstance?.left.subscribe(() => this.finish(ref));
    ref.keydownEvents.subscribe((event) => {
      if (event.key === KEYBOARD_KEY.Escape && !event.defaultPrevented) {
        event.preventDefault();
        this.close({ animated: true });
      }
    });
    ref.backdropClick.subscribe(() => this.close({ animated: true }));
    ref.closed.subscribe(() => {
      if (this.ref === ref) {
        this.ref = undefined;
        this.openState.set(false);
      }
    });
  }

  /** Closes the drawer; `animated` slides it out first (Esc, scrim, close button). */
  close(options: { animated?: boolean } = {}): void {
    const ref = this.ref;
    const instance = ref?.componentInstance;
    if (!ref || !instance || instance.leaving()) {
      return;
    }
    if (!options.animated || globalThis.matchMedia?.(REDUCED_MOTION_QUERY).matches) {
      this.finish(ref);
      return;
    }
    instance.leaving.set(true);
    ref.overlayRef.detachBackdrop();
  }

  private finish(ref: DialogRef<void, SidebarDrawerComponent>): void {
    ref.overlayRef.detachBackdrop();
    ref.close();
  }
}
