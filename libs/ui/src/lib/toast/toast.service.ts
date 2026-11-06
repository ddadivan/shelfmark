import { ComponentPortal } from '@angular/cdk/portal';
import { inject, Service, type ComponentRef } from '@angular/core';
import type { ConnectedOverlay } from '../overlay/connected-overlay';
import { UiOverlay } from '../overlay/overlay.service';
import type { ToastOptions } from './models/toast-options.interface';
import type { ToastRef } from './models/toast-ref.interface';
import { ToastRegionComponent } from './toast-region.component';
import { ToastStore } from './toast-store';

/**
 * Short confirmations and undo. `show()` renders a `ui-toast` in the `toast` overlay layer
 * (bottom-centre on phones, bottom-left from the tablet breakpoint up). One toast at a time:
 * a new one replaces the older. It lasts 4 s (8 s with an action) and waits while hovered or
 * focused; it never takes focus. The live region is created once, with the service, and stays
 * in the page. Inject the service early (a field initialiser is fine) so the region has been
 * rendered before the first toast, which keeps that first one announced.
 */
@Service()
export class ToastService {
  private readonly store = inject(ToastStore);
  private readonly region: ConnectedOverlay;
  private readonly regionRef: ComponentRef<ToastRegionComponent>;

  constructor() {
    this.region = inject(UiOverlay).global({ layer: 'toast', panelClass: 'ui-toast-pane' });
    this.regionRef = this.region.attach(new ComponentPortal(ToastRegionComponent));
  }

  show(options: ToastOptions): ToastRef {
    const item = this.store.push(options);
    return { dismiss: () => this.store.dismiss(item.id) };
  }

  /** Closes the toast on screen, if any. */
  dismiss(): void {
    const current = this.store.items()[0];
    if (current) {
      this.store.dismiss(current.id);
    }
  }

  /**
   * Moves focus to the action button of the toast on screen. Only an explicit call moves focus
   * (a toast never takes it by itself); while focused the timer is paused. Does nothing without
   * a toast or an action. The app binds a shortcut to it, so keyboard users can reach an Undo
   * before the toast closes.
   */
  focusAction(): void {
    if (!this.store.items()[0]?.action) {
      return;
    }
    const actions = (
      this.regionRef.location.nativeElement as HTMLElement
    ).querySelectorAll<HTMLElement>('.ui-toast__action');
    // A replaced toast can still be leaving: the newest one is last.
    actions.item(actions.length - 1).focus();
  }
}
