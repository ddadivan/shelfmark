import { MenuItem } from '@angular/aria/menu';
import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { RippleDirective } from '../ripple/ripple.directive';
import type { MenuItemType } from './models/menu-item-type.type';

const ROLES = {
  item: 'menuitem',
  checkbox: 'menuitemcheckbox',
  radio: 'menuitemradio',
} as const;

/**
 * One action in a `ui-menu`. The label is the projected text. `icon` and `shortcut` are
 * decoration (the shortcut is only a hint; the feature binds the key). `danger` styles a
 * destructive action; disabled items stay in the arrow-key order, are announced as disabled and
 * cannot be activated. `selected` marks the current choice of a group: pair it with
 * `type="radio"` (or `checkbox`) so assistive technology hears the state.
 *
 * The native element with the Angular Aria `ngMenuItem` behaviour is an inner `div`; the host
 * is a presentational wrapper. A ripple plays on press (none under reduced motion).
 * Typeahead matches the start of the label text.
 */
@Component({
  selector: 'ui-menu-item',
  imports: [MenuItem, IconComponent, RippleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'none' },
  templateUrl: './menu-item.component.html',
  styleUrl: './menu-item.component.scss',
})
export class MenuItemComponent {
  readonly icon = input<IconName>();
  /** Shortcut hint shown at the end, for example `⌘C`. */
  readonly shortcut = input<string>();
  readonly danger = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Current choice of a group (a theme, a sort order); adds `is-selected`. */
  readonly selected = input(false, { transform: booleanAttribute });
  /** `item` (action), `checkbox` or `radio`; sets the ARIA role of the inner element. */
  readonly type = input<MenuItemType>('item');

  /** The item was chosen (click, Enter or Space); the menu closes and gives focus back first. */
  readonly activated = output<void>();

  private readonly aria = viewChild.required(MenuItem);
  private readonly label = viewChild.required<ElementRef<HTMLElement>>('label');

  /** Label text for the typeahead of Angular Aria. */
  protected readonly searchText = signal('');

  protected readonly ariaRole = computed(() => ROLES[this.type()]);

  /** Whether this is the item the menu pattern has under the cursor or focus. */
  readonly isActive = computed(() => this.aria().active());

  constructor() {
    afterRenderEffect(() => {
      const text = this.label().nativeElement.textContent.trim();
      if (text !== this.searchText()) {
        this.searchText.set(text);
      }
    });
  }

  /** Called by the owning menu after it has closed. */
  activate(): void {
    if (!this.disabled()) {
      this.activated.emit();
    }
  }
}
