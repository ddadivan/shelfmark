import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Groups related content or settings on the `surface` with `shadow-card` (Panel spec). The
 * content is projected. Panels never nest: inside a panel, group with a `bg` inset instead.
 */
@Component({
  selector: 'ui-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-panel' },
  template: '<ng-content />',
  styleUrl: './panel.component.scss',
})
export class PanelComponent {}
