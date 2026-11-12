import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { RippleDirective } from '../../directives/ripple/ripple.directive';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import type { SavedViewItem } from './models/saved-view-item.interface';
import type { SavedViewMenuRequest } from './models/saved-view-menu-request.interface';
import { SAVED_VIEWS_LAYOUT } from './models/saved-views-layout.const';
import type { SavedViewsLayout } from './models/saved-views-layout.type';

/**
 * Saved view chips (SavedView spec): a toolbar of toggle buttons ("All 12", "Videos 5", …), the
 * active one filled `primary`, and a dashed "+ Save this view" button at the end. Angular Aria's
 * toolbar gives one tab stop and the arrow keys, Home and End (no wrap); Enter and Space are the
 * native button activation. A chip with a `menuLabel` gets a trailing "…" button (a toolbar
 * widget too; clipped until hover or focus on hover-capable pointers, always shown on touch), and
 * a right click on the chip asks for the same menu. `layout` wraps (desktop) or scrolls sideways
 * in one row (phone); the feature picks it, no CSS hides anything.
 *
 * Presentational: the feature owns the views, the menu and the dialog.
 */
@Component({
  selector: 'ui-saved-views',
  imports: [IconComponent, RippleDirective, TooltipDirective, Toolbar, ToolbarWidget],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-saved-views',
    '[class.ui-saved-views--scroll]': 'layout() === SAVED_VIEWS_LAYOUT.Scroll',
  },
  templateUrl: './saved-views.component.html',
  styleUrl: './saved-views.component.scss',
})
export class SavedViewsComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly SAVED_VIEWS_LAYOUT = SAVED_VIEWS_LAYOUT;

  readonly items = input.required<readonly SavedViewItem[]>();
  /** Id of the pressed chip; none when the current filter matches no view. */
  readonly activeId = input<string | null>(null);
  /** Accessible name of the toolbar, for example "Saved views". */
  readonly ariaLabel = input.required<string>();
  /** Label of the dashed add button ("Save this view"); no button when empty. */
  readonly addLabel = input('');
  readonly layout = input<SavedViewsLayout>(SAVED_VIEWS_LAYOUT.Wrap);

  /** The id of the chip that was pressed (also when it is already active). */
  readonly selected = output<string>();
  readonly add = output<void>();
  readonly menuRequested = output<SavedViewMenuRequest>();

  protected requestMenu(event: MouseEvent, item: SavedViewItem, origin: HTMLElement): void {
    if (!item.menuLabel) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.menuRequested.emit({ id: item.id, origin });
  }
}
