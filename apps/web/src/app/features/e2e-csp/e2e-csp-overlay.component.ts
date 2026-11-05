import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Overlay content with its own `styleUrl`: Angular injects that style at runtime (CSP e2e). */
@Component({
  selector: 'app-e2e-csp-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './e2e-csp-overlay.component.html',
  styleUrl: './e2e-csp-overlay.component.scss',
})
export class E2eCspOverlayComponent {}
