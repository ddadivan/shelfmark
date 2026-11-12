import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  isDevMode,
  output,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { TAB_BAR_MAX_SLOTS } from './models/tab-bar-max-items.const';
import type { TabBarItem } from './models/tab-bar-item.interface';
import type { TabBarSelection } from './models/tab-bar-selection.interface';

/**
 * The phone's main navigation: a floating glass bar with the destinations and the primary Add
 * button in the middle. Five slots in all, so at most four `items` (Library, Search, Tags, You);
 * dev mode throws on more. Labels are always visible. A `nav` named by `ariaLabel`; items with
 * an `href` are real `<a>`, the active one has `aria-current="page"`. A plain left click emits
 * `selected` (call `event.preventDefault()` to route in the app); middle and Cmd/Ctrl-click keep
 * the native behaviour. Items without `href` are buttons. Fixed 16px from the sides and 20px
 * (plus the safe area) from the bottom unless `fixed` is off (stories, inline use); the content
 * behind scrolls with 110px bottom padding and toasts sit 12px above it.
 */
@Component({
  selector: 'ui-tab-bar',
  imports: [IconComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-tab-bar', '[class.ui-tab-bar--fixed]': 'fixed()' },
  templateUrl: './tab-bar.component.html',
  styleUrl: './tab-bar.component.scss',
})
export class TabBarComponent {
  /** The destinations, left to right; the Add button is inserted in the middle. */
  readonly items = input.required<readonly TabBarItem[]>();
  /** Id of the current destination. */
  readonly active = input<string>();
  /** Accessible name of the `nav`, for example "Main". */
  readonly ariaLabel = input.required<string>();
  /** Accessible name of the Add button, for example "Add link". */
  readonly addLabel = input.required<string>();
  /** Pins the bar to the bottom of the viewport; off renders it in the flow. */
  readonly fixed = input(true, { transform: booleanAttribute });

  /** A destination was chosen (plain left click or keyboard activation). */
  readonly selected = output<TabBarSelection>();
  /** The Add button was pressed. */
  readonly add = output<void>();

  /** Items before and after the Add button. */
  protected readonly before = computed(() =>
    this.items().slice(0, Math.ceil(this.items().length / 2)),
  );
  protected readonly after = computed(() => this.items().slice(Math.ceil(this.items().length / 2)));

  constructor() {
    // Developer-error guard, dev mode only.
    if (isDevMode()) {
      effect(() => {
        if (this.items().length > TAB_BAR_MAX_SLOTS - 1) {
          throw new Error(
            `ui-tab-bar: at most ${TAB_BAR_MAX_SLOTS - 1} items (the Add button is the fifth slot).`,
          );
        }
      });
    }
  }

  protected onClick(event: MouseEvent, item: TabBarItem): void {
    // Modified and non-primary clicks keep the browser's own navigation.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    this.selected.emit({ id: item.id, event });
  }
}
