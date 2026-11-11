import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A small heading over a group of items ("Sort by", "View"). Not interactive and not an item:
 * arrow keys skip it. Put a `ui-menu-separator` between groups.
 */
@Component({
  selector: 'ui-menu-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'presentation', class: 'ui-menu-label' },
  template: '<ng-content />',
  styleUrl: './menu-label.component.scss',
})
export class MenuLabelComponent {}
