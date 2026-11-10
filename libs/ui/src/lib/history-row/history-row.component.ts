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
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { UI_RIPPLE_IGNORE } from '../ripple/models/ui-ripple-ignore.const';
import { RippleDirective } from '../ripple/ripple.directive';

let nextRowId = 0;

/**
 * One opened (or trashed) link inside a `ui-history-group`: a 72 x 48 preview (48 x 48 on phones),
 * the title and `meta` (the folder: the app puts a `ui-folder-icon size="sm"` and its name there),
 * `time` (text, or a badge) and `actions` (buttons).
 * Slots (`slot="..."` attributes): `title` and `meta` inside the link, `time`, `actions`.
 *
 * **One activation target**, as in `ui-list-item`: title and meta live in one native `<a href>`
 * (or `<button>` without `href`) whose `::after` is stretched over the row, so the row is one tab
 * stop. `actions` sit above that layer (z-index 2) and never activate the row. `activated` emits
 * the click (the feature may `preventDefault()` an `href` click); `newTab` adds `target="_blank"`
 * and `rel="noopener noreferrer"`; `description` is hidden text after the title.
 *
 * `preview` is an image URL (the app CSP blocks external images for now, so the picture icon
 * shows, see the image-sources issue #57). Swipe actions on phones are not part of the library.
 */
@Component({
  selector: 'ui-history-row',
  imports: [NgTemplateOutlet, IconComponent],
  hostDirectives: [{ directive: RippleDirective, inputs: ['uiRipple: ripple'] }],
  providers: [{ provide: UI_RIPPLE_IGNORE, useValue: '.ui-history-row__actions' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-history-row',
    role: 'listitem',
  },
  templateUrl: './history-row.component.html',
  styleUrl: './history-row.component.scss',
})
export class HistoryRowComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly descriptionId = `ui-history-row-description-${nextRowId++}`;

  /** Makes the activation target an `<a href>`; without it a `<button type="button">`. */
  readonly href = input<string>();
  /** Opens `href` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). */
  readonly newTab = input(false, { transform: booleanAttribute });
  /** Preview image URL; a picture icon shows when it is empty or fails to load. */
  readonly preview = input<string>();
  /** Extra text for screen readers after the title, for example "opens in a new tab". */
  readonly description = input<string>();

  /** The row was activated (click, Enter or Space on the title link or button). */
  readonly activated = output<MouseEvent>();

  /** Set when the current `preview` failed to load; resets when `preview` changes. */
  protected readonly failed = linkedSignal<string | undefined, boolean>({
    source: this.preview,
    computation: () => false,
  });
  protected readonly previewSrc = computed(() => (this.failed() ? null : this.preview() || null));
}
