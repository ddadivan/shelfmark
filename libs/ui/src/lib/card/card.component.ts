import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import type { HeadingLevel } from '../heading';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';

let nextId = 0;

/**
 * Surface of a saved link in the cards view: a `surface` box with a `border` hairline and
 * `radius-lg`, flat at rest. Content comes in through slots (`slot="..."` attributes):
 * `title` (inside the link, so it names the card), `meta` (favicon and domain, left of the
 * meta row), `favorite` (a toggle at the end of the meta row), `actions` (the "..." menu
 * trigger, top right), `overlay` (the bar over the preview, for example the domain and
 * "Open"), `fallback` (shown instead of the image, for example the site letter on `accent-bg`;
 * without it a picture icon is shown), `select` (a `ui-checkbox` for bulk selection, top left
 * over the preview: shown on hover, focus inside, while `selecting` and always on touch); the
 * default slot is the body below the title (note, tags).
 *
 * **One activation target.** The title lives in a single native `<a>` (with `href`) or
 * `<button>` (without) whose `::after` is stretched over the whole card, so the card has one
 * tab stop and no interactive element is nested inside another. `favorite` and `actions`
 * sit above that layer, so using them never activates the card. `activated` emits the click
 * (the feature may `preventDefault()` an `href` click to route); `newTab` opens `href` in a
 * new tab with `noopener noreferrer` (the same tab keeps `noreferrer`). The link sits in a heading of `headingLevel` (default
 * `h2`), so screen reader users can navigate cards by heading; the heading itself is not
 * positioned, so the stretched `::after` still covers the card.
 *
 * Images: the app CSP is `img-src 'self' data:`, so external preview images and favicons
 * are blocked and the fallbacks show until stage 3 decides on an image proxy or a CSP change
 * (see the image-sources issue #57 in milestone 3).
 *
 * Hover (pointer devices only): a soft shadow spreads from under the card (320 ms), the
 * border darkens (in dark theme the surface brightens a little with a faint glow), the image
 * zooms to 1.06, the overlay slides up 8 px and the actions fade in. Press tightens the
 * shadow (80 ms). The card never lifts or scales and has no ripple. Actions are always
 * visible on touch and while the card has focus inside. Under reduced motion there is no zoom
 * or slide; colour and shadow transitions stay.
 */
@Component({
  selector: 'ui-card',
  imports: [NgTemplateOutlet, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-card',
    '[class.ui-card--selected]': 'selected()',
    '[class.ui-card--checked]': 'checked()',
    '[class.ui-card--selecting]': 'selecting()',
    '[class.ui-card--pinned]': 'actionsPinned()',
    '[class.ui-card--reveal]': 'reveal()',
  },
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  /** Id of the visually hidden description that the link points to. */
  protected readonly descriptionId = `ui-card-description-${nextId++}`;

  /** Preview image URL (16:9, cover). Without it, or when it fails, the `fallback` slot shows. */
  readonly image = input<string>();
  /** Makes the activation target an `<a href>`; without it a `<button type="button">`. */
  readonly href = input<string>();
  /** Opens `href` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). */
  readonly newTab = input(false, { transform: booleanAttribute });
  /** Selected state: `accent` border and `accent-bg` surface; sets `aria-current="true"`. */
  readonly selected = input(false, { transform: booleanAttribute });
  /**
   * Picked for a bulk action (Checkbox spec): a 2px `primary` ring. No ARIA of its own: the
   * checkbox in the `select` slot carries the state.
   */
  readonly checked = input(false, { transform: booleanAttribute });
  /** A selection is in progress: the `select` slot shows on every card, not only on hover or focus. */
  readonly selecting = input(false, { transform: booleanAttribute });
  /** Extra text for screen readers after the title, for example "opens in a new tab". */
  readonly description = input<string>();
  /** Keeps the actions visible without hover or focus, for example while their menu is open. */
  readonly actionsPinned = input(false, { transform: booleanAttribute });
  /**
   * Level of the heading that wraps the link (2 by default, under the page `h1`). Set it so the
   * outline never skips a level, for example 3 under an `h2` section title.
   */
  readonly headingLevel = input<HeadingLevel>(2);
  /** Plays the 200 ms fade-in; set it on cards that replace a skeleton. */
  readonly reveal = input(false, { transform: booleanAttribute });

  /** The card was activated (click, Enter or Space on the title link or button). */
  readonly activated = output<MouseEvent>();

  /** Set when the current `image` failed to load; resets when `image` changes. */
  protected readonly failed = linkedSignal<string | undefined, boolean>({
    source: this.image,
    computation: () => false,
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * The bar sits above the stretched link so a feature can style it on hover; a click on it
   * activates the title link instead (modifier keys kept, so a Ctrl-click still opens a tab).
   */
  protected forwardOverlayClick(event: MouseEvent): void {
    this.host.querySelector<HTMLElement>('.ui-card__link')?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: event.button,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      }),
    );
  }

  protected readonly imageSrc = computed(() => (this.failed() ? null : this.image() || null));
}
