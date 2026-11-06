import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A line between groups of items. Put the destructive item last, after a separator.
 */
@Component({
  selector: 'ui-menu-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'separator', class: 'ui-menu-separator' },
  template: '',
  styleUrl: './menu-separator.component.scss',
})
export class MenuSeparatorComponent {}
