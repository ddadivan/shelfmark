import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ButtonComponent, IconComponent } from '@shelfmark/ui';
import { E2eCspOverlayComponent } from './e2e-csp-overlay.component';

/**
 * Test fixture, only routed in the `e2e` build configuration (`app.routes.e2e.ts`).
 * Renders `ui-button`, `ui-icon` and opens a CDK overlay (no `libs/ui` overlay exists yet), all of
 * which add `<style>` elements at runtime, so the CSP e2e test can check them under the nonce
 * policy. Fixture text is not translated: the page never ships.
 */
@Component({
  selector: 'app-e2e-csp-page',
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './e2e-csp.page.html',
})
export default class E2eCspPage {
  private readonly overlay = inject(Overlay);
  private overlayRef: OverlayRef | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.overlayRef?.dispose());
  }

  protected openOverlay(): void {
    if (this.overlayRef) {
      return;
    }
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
    });
    this.overlayRef.attach(new ComponentPortal(E2eCspOverlayComponent));
  }
}
