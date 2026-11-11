import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { UI_RIPPLE_IGNORE } from '../ripple/models/ui-ripple-ignore.const';
import { RippleDirective } from '../ripple/ripple.directive';
import { ICON_SIZE } from '../icon/models/icon-size.const';

let nextId = 0;

/**
 * One saved link in the list view (and, `compact`, in "Recently opened"): a row with `leading`
 * (a `ui-favicon`, or `thumb` for a 56 x 40 preview), the main text and `trailing` controls.
 * Slots (`slot="..."` attributes): `select` (a `ui-checkbox` for bulk selection, first in the
 * row and above the link; it keeps its place and shows on hover, focus inside, while `selecting`
 * and always on touch), `leading`, `title` and `meta` (both inside the link, so they name it),
 * `trailing` (tags, the favorite toggle, the "..." menu trigger).
 *
 * **One activation target.** The title and meta live in a single native `<a>` (with `href`) or
 * `<button>` (without) whose `::after` is stretched over the row, so the row has one tab stop
 * and no interactive element is nested inside another. `trailing` sits above that layer and
 * never activates the row. `activated` emits the click (the feature may `preventDefault()` an
 * `href` click to route); `newTab` opens `href` in a new tab with `noopener noreferrer`.
 *
 * Images: the app CSP is `img-src 'self' data:`, so external preview images and favicons
 * are blocked and the fallbacks show until stage 3 decides on an image proxy or a CSP change
 * (see the image-sources issue #57 in milestone 3).
 *
 * Hover (pointer devices only) is `surface-hover`, `selected` is `accent-bg`, focus is the
 * 2px ring, a press plays the ripple (`ripple` opts out). Under reduced motion there is no
 * ripple: the row shows `surface-pressed` while pressed. The ripple ignores events from the trailing controls
 * (`UI_RIPPLE_IGNORE`), which still bubble normally.
 */
@Component({
  selector: 'ui-list-item',
  imports: [NgTemplateOutlet, IconComponent],
  hostDirectives: [{ directive: RippleDirective, inputs: ['uiRipple: ripple'] }],
  providers: [
    { provide: UI_RIPPLE_IGNORE, useValue: '.ui-list-item__trailing, .ui-list-item__select' },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-list-item',
    '[class.ui-list-item--selected]': 'selected()',
    '[class.ui-list-item--checked]': 'checked()',
    '[class.ui-list-item--selecting]': 'selecting()',
    '[class.ui-list-item--compact]': 'compact()',
    '[class.ui-list-item--reveal]': 'reveal()',
  },
  templateUrl: './list-item.component.html',
  styleUrl: './list-item.component.scss',
})
export class ListItemComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  /** Id of the visually hidden description that the link points to. */
  protected readonly descriptionId = `ui-list-item-description-${nextId++}`;

  /** Makes the activation target an `<a href>`; without it a `<button type="button">`. */
  readonly href = input<string>();
  /** Opens `href` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). */
  readonly newTab = input(false, { transform: booleanAttribute });
  /** Selected state: `accent-bg`; sets `aria-current="true"`. */
  readonly selected = input(false, { transform: booleanAttribute });
  /** Picked for a bulk action: `accent-bg`, no ARIA of its own (the `select` checkbox carries it). */
  readonly checked = input(false, { transform: booleanAttribute });
  /** A selection is in progress: the `select` slot shows on every row, not only on hover or focus. */
  readonly selecting = input(false, { transform: booleanAttribute });
  /** Denser row (8px padding, smaller title) for side panels. */
  readonly compact = input(false, { transform: booleanAttribute });
  /**
   * Preview image URL. Setting it (even to an empty string) reserves the 56 x 40 thumb: the
   * image when it loads, a picture icon when it is empty or fails. Unset: no thumb.
   */
  readonly thumb = input<string>();
  /** Extra text for screen readers after the title, for example "opens in a new tab". */
  readonly description = input<string>();
  /** Plays the 200 ms fade-in; set it on rows that replace a skeleton. */
  readonly reveal = input(false, { transform: booleanAttribute });

  /** The row was activated (click, Enter or Space on the title link or button). */
  readonly activated = output<MouseEvent>();

  /** Set when the current `thumb` failed to load; resets when `thumb` changes. */
  protected readonly failed = linkedSignal<string | undefined, boolean>({
    source: this.thumb,
    computation: () => false,
  });

  protected readonly hasThumb = computed(() => this.thumb() !== undefined);
  protected readonly thumbSrc = computed(() => (this.failed() ? null : this.thumb() || null));
}
