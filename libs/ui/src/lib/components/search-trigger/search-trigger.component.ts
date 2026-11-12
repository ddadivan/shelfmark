import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * The pill in the top bar that stands in for the search field (Main spec): a search icon, the
 * hint text and the shortcut caps. It is a native button, not a text field: pressing it (click,
 * Enter, Space) is the host's `click`, and the feature opens its search overlay. The visible
 * text is the accessible name; the shortcut caps are decorative (`ariaKeyshortcuts` names them
 * for assistive technology).
 */
@Component({
  selector: 'ui-search-trigger',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-search-trigger' },
  templateUrl: './search-trigger.component.html',
  styleUrl: './search-trigger.component.scss',
})
export class SearchTriggerComponent {
  /** Hint text; it is also the button's accessible name. */
  readonly label = input.required<string>();
  /** Shortcut caps on the right, for example `⌘K`. */
  readonly shortcut = input('');
  /** Value of `aria-keyshortcuts`, for example `Meta+K Control+K`. */
  readonly ariaKeyshortcuts = input<string>();
  /** `aria-haspopup` of the button: the overlay it opens. */
  readonly ariaHaspopup = input<'dialog'>();

  private readonly control = viewChild.required<ElementRef<HTMLButtonElement>>('control');

  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }
}
