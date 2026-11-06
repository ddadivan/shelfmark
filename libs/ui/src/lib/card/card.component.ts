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

/**
 * Surface of a saved link in the cards view: a `surface` box with a `border` hairline and
 * `radius-lg`, flat at rest. Content comes in through slots (`slot="..."` attributes):
 * `title` (inside the link, so it names the card), `meta` (favicon and domain, left of the
 * meta row), `favorite` (a toggle at the end of the meta row), `actions` (the "..." menu
 * trigger, top right), `overlay` (the bar over the preview, for example the domain and
 * "Open"), `fallback` (shown instead of the image, for example the site letter on `accent-bg`;
 * without it a picture icon is shown); the default slot is the body below the title (note,
 * tags).
 *
 * **One activation target.** The title lives in a single native `<a>` (with `href`) or
 * `<button>` (without) whose `::after` is stretched over the whole card, so the card has one
 * tab stop and no interactive element is nested inside another. `favorite` and `actions`
 * sit above that layer, so using them never activates the card. `activated` emits the click
 * (the feature may `preventDefault()` an `href` click to route); `newTab` opens `href` in a
 * new tab with `noopener noreferrer`.
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
    '[class.ui-card--pinned]': 'actionsPinned()',
    '[class.ui-card--reveal]': 'reveal()',
  },
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  /** Preview image URL (16:9, cover). Without it, or when it fails, the `fallback` slot shows. */
  readonly image = input<string>();
  /** Makes the activation target an `<a href>`; without it a `<button type="button">`. */
  readonly href = input<string>();
  /** Opens `href` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). */
  readonly newTab = input(false, { transform: booleanAttribute });
  /** Selected state: `accent` border and `accent-bg` surface; sets `aria-current="true"`. */
  readonly selected = input(false, { transform: booleanAttribute });
  /** Extra text for screen readers after the title, for example "opens in a new tab". */
  readonly description = input<string>();
  /** Keeps the actions visible without hover or focus, for example while their menu is open. */
  readonly actionsPinned = input(false, { transform: booleanAttribute });
  /** Plays the 200 ms fade-in; set it on cards that replace a skeleton. */
  readonly reveal = input(false, { transform: booleanAttribute });

  /** The card was activated (click, Enter or Space on the title link or button). */
  readonly activated = output<MouseEvent>();

  /** Set when the current `image` failed to load; resets when `image` changes. */
  protected readonly failed = linkedSignal<string | undefined, boolean>({
    source: this.image,
    computation: () => false,
  });

  protected readonly imageSrc = computed(() => (this.failed() ? null : this.image() || null));
}
