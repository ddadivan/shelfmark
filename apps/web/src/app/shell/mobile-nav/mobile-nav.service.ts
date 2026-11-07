import { DestroyRef, Service, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { DrawerService, type UiDialogRef } from '@shelfmark/ui';
import { filter } from 'rxjs';
import { MobileNavComponent } from './mobile-nav.component';

/**
 * Opens the phone menu (`MobileNavComponent`) in the `libs/ui` drawer. It closes itself when a
 * navigation ends; the shell closes it when the viewport grows past the phone width. Focus
 * returns to the menu button (the drawer restores it).
 */
@Service()
export class MobileNavService {
  private readonly drawers = inject(DrawerService);
  private readonly transloco = inject(TranslocoService);

  private ref: UiDialogRef<undefined, MobileNavComponent> | undefined;
  private readonly openState = signal(false);
  /** The drawer is on screen (for `aria-expanded` of the opener). */
  readonly isOpen = this.openState.asReadonly();

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        void this.close();
      });
  }

  open(): void {
    if (this.ref) {
      return;
    }
    const ref = this.drawers.open<MobileNavComponent>(MobileNavComponent, {
      ariaLabel: this.transloco.translate('shell.drawer.label'),
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
