import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { RippleDirective } from '../ripple/ripple.directive';
import type { BulkBarAction } from './models/bulk-bar-action.interface';
import { BULK_BAR_LAYOUT } from './models/bulk-bar-layout.const';
import type { BulkBarLayout } from './models/bulk-bar-layout.type';

/**
 * The bulk-action bar (Bulk and MobileBulk screens): a glass toolbar of actions for the selected
 * items ("Move", "Tags", "Favorite", …, "Delete"). Angular Aria's toolbar gives one tab stop, the
 * arrow keys, Home and End; Enter and Space are the native button activation. Danger actions get
 * `danger` text and, in the `inline` layout, a divider before the first of them. `stacked` puts the
 * icon above the label and lets the buttons share the width (phone, like the tab bar).
 *
 * Presentational: the feature positions the bar (it is not fixed), owns the selection and runs
 * the actions. Put `animate.enter="ui-bulk-bar--enter"` and `animate.leave="ui-bulk-bar--leave"`
 * on the element to let it rise in and drop out like a toast (reduced motion: a fade).
 */
@Component({
  selector: 'ui-bulk-bar',
  imports: [IconComponent, RippleDirective, Toolbar, ToolbarWidget],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-bulk-bar',
    '[class.ui-bulk-bar--stacked]': 'layout() === BULK_BAR_LAYOUT.Stacked',
  },
  templateUrl: './bulk-bar.component.html',
  styleUrl: './bulk-bar.component.scss',
})
export class BulkBarComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly BULK_BAR_LAYOUT = BULK_BAR_LAYOUT;

  readonly actions = input.required<readonly BulkBarAction[]>();
  /** Accessible name of the toolbar, for example "Actions for 3 selected links". */
  readonly ariaLabel = input.required<string>();
  readonly layout = input<BulkBarLayout>(BULK_BAR_LAYOUT.Inline);

  /** The id of the pressed action. */
  readonly action = output<string>();

  /** Index of the first danger action: the inline layout draws a divider before it. */
  protected readonly dividerAt = computed(() => {
    const index = this.actions().findIndex((item) => item.danger === true);
    return index > 0 && this.layout() === BULK_BAR_LAYOUT.Inline ? index : -1;
  });

  /** A disabled action stays focusable in the toolbar (`aria-disabled`), so the click is ignored here. */
  protected press(item: BulkBarAction): void {
    if (!item.disabled) {
      this.action.emit(item.id);
    }
  }
}
