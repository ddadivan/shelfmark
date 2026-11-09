import { Service, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { DRAWER_SIDE, DrawerService, type UiDialogRef } from '@shelfmark/ui';
import { RecentLinksDrawerComponent } from './recent-links-drawer.component';

/**
 * Opens the recent links in the `libs/ui` drawer at the inline-end edge (tablet range). The
 * drawer brings the scrim, Esc, the focus trap and focus return to the toggle that opened it.
 */
@Service()
export class RecentLinksDrawerService {
  private readonly drawers = inject(DrawerService);
  private readonly transloco = inject(TranslocoService);

  private ref: UiDialogRef<undefined, RecentLinksDrawerComponent> | undefined;
  private readonly openState = signal(false);
  /** The drawer is on screen (for `aria-expanded` of the toggle). */
  readonly isOpen = this.openState.asReadonly();

  open(): void {
    if (this.ref) {
      return;
    }
    const ref = this.drawers.open<RecentLinksDrawerComponent>(RecentLinksDrawerComponent, {
      side: DRAWER_SIDE.End,
      ariaLabel: this.transloco.translate('links.recent.title'),
    });
    this.ref = ref;
    this.openState.set(true);
    void ref.result.then(() => {
      if (this.ref === ref) {
        this.ref = undefined;
        this.openState.set(false);
      }
    });
  }

  /** Slides the drawer out; resolves once it is gone (at once when it is not open). */
  async close(): Promise<void> {
    const ref = this.ref;
    if (ref) {
      ref.close();
      await ref.result;
    }
  }
}
