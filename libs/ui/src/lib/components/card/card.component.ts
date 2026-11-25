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
  signal,
  viewChild,
} from '@angular/core';
import type { HeadingLevel } from '../../models/heading';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { CARD_MEDIA } from './models/card-media.const';
import type { CardMedia } from './models/card-media.type';

let nextId = 0;

/**
 * The link card of the feed (Shelf LinkCard): a `surface` box with a hairline at rest (a lighter
 * fill in dark) and `radius-card` corners. The preview is full bleed at the top (`media`) and
 * content comes in through slots (`slot="..."` attributes): over the preview `play` (top left,
 * videos), `favorite` (top right), `actions` (the "..." menu trigger, beside the star: only on
 * keyboard focus inside the card, while its menu is open and on touch, never on hover) and `select`
 * (a `ui-checkbox` for bulk selection, in the place of the play mark: shown in select mode
 * (`selecting`), on a `checked` card and on keyboard focus, never on hover), plus `overlay` (a bar over the preview)
 * and `fallback` (shown instead of the image, for example the site letter; without it a picture
 * drawing). In the body: `meta` (the folder: filled icon and name) with `date` at its end,
 * `title` (inside the link, so it names the card), `source` (favicon and channel, repository or
 * price and domain), `summary` (the description, under the source), `tags` (up to three `#tag` words) and `note` (the person's note, with a pen,
 * on sage); the default slot is for anything else. Every empty slot takes no room.
 *
 * **One activation target.** The title lives in a single native `<a>` (with `href`) or
 * `<button>` (without) whose `::after` is stretched over the whole card, so the card has one
 * tab stop and no interactive element is nested inside another. The buttons over the preview sit
 * above that layer, so using them never activates the card. `activated` emits the click (the
 * feature may `preventDefault()` an `href` click to route); `newTab` opens `href` in a new tab
 * with `noopener noreferrer` (the same tab keeps `noreferrer`). The link sits in a heading of
 * `headingLevel` (default `h2`), so screen reader users can navigate cards by heading; the
 * heading itself is not positioned, so the stretched `::after` still covers the card.
 *
 * States: `selected` (open in the preview pane) is the `pick` fill; `checked` (a bulk pick) adds a
 * 2px `accent` ring.
 *
 * Images: the app CSP is `img-src 'self' data:`, so external preview images and favicons
 * are blocked and the fallbacks show until stage 3 decides on an image proxy or a CSP change
 * (see the image-sources issue #57 in milestone 3).
 *
 * Hover (pointer devices only, Shelf reference): only a slight colour change of the card, the soft
 * hover shadow in light and a 4% white overlay in dark (`--card-hover-bg`). No lift, no zoom, no
 * controls appear. Press tightens the shadow (80 ms). No ripple.
 */
@Component({
  selector: 'ui-card',
  imports: [NgTemplateOutlet, TooltipDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-card',
    '[class.ui-card--selected]': 'selected()',
    '[class.ui-card--checked]': 'checked()',
    '[class.ui-card--selecting]': 'selecting()',
    '[class.ui-card--pinned]': 'actionsPinned()',
    '[class.ui-card--favorited]': 'favorited()',
    '[class.ui-card--reveal]': 'reveal()',
    '[class.ui-card--natural]': 'media() === CARD_MEDIA.Natural',
    '[class.ui-card--contain]': 'media() === CARD_MEDIA.Contain',
    '[class.ui-card--image]': 'imageSrc() !== null',
    '[style.--ui-card-ratio]': 'imageRatio() ?? null',
  },
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss', './card-content.scss', './card-actions.scss'],
})
export class CardComponent {
  protected readonly CARD_MEDIA = CARD_MEDIA;
  protected readonly ICON_SIZE = ICON_SIZE;

  /**
   * The full title while it is cut by the two-line clamp, else empty (no tooltip). Measured on
   * hover and keyboard focus, like the breadcrumbs, so a title that fits never shows one.
   */
  protected readonly cutTitle = signal('');
  /** The title text: hovering it (not the rest of the card) opens the full-title tooltip. */
  protected readonly titleText = viewChild<ElementRef<HTMLElement>>('titleText');

  /** Id of the visually hidden description that the link points to. */
  protected readonly descriptionId = `ui-card-description-${nextId++}`;

  /** Preview image URL. Without it, or when it fails, the `fallback` slot shows. */
  readonly image = input<string>();
  /**
   * How the preview is cut: `natural` (the picture's own ratio, masonry), `cover` (4:3, cropped,
   * the Cards view; the default) or `contain` (4:3, the whole picture on `surface-hover`, shops).
   */
  readonly media = input<CardMedia>(CARD_MEDIA.Cover);
  /**
   * Width over height of the picture (1.5 for 3:2) when it is known: with `media="natural"` it
   * reserves the preview's height before the image loads, so a masonry feed does not jump.
   */
  readonly imageRatio = input<number | undefined>(undefined);
  /**
   * Which soft background the drawing placeholder (no image, no `fallback` content) takes: the
   * number is taken modulo 3 over `accent-bg`, `surface-hover` and `surface-pressed`. A feature
   * passes the card's index or a hash of its id so neighbours differ.
   */
  readonly placeholderTone = input(0, {
    transform: (value: number | null | undefined) => value ?? 0,
  });
  /** Makes the activation target an `<a href>`; without it a `<button type="button">`. */
  readonly href = input<string>();
  /** Opens `href` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). */
  readonly newTab = input(false, { transform: booleanAttribute });
  /** Open in the preview pane: the `pick` fill; sets `aria-current="true"`. */
  readonly selected = input(false, { transform: booleanAttribute });
  /**
   * Picked for a bulk action: the `pick` fill and a 2px `accent` ring. No ARIA of its own: the
   * checkbox in the `select` slot carries the state.
   */
  readonly checked = input(false, { transform: booleanAttribute });
  /** A selection is in progress: the `select` slot shows on every card, not only on hover or focus. */
  readonly selecting = input(false, { transform: booleanAttribute });
  /** Extra text for screen readers after the title, for example "opens in a new tab". */
  readonly description = input<string>();
  /** The `favorite` toggle stays visible at rest (not only on hover or focus) while it is on. */
  readonly favorited = input(false, { transform: booleanAttribute });
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

  protected readonly tone = computed(() => ((this.placeholderTone() % 3) + 3) % 3);

  protected readonly imageSrc = computed(() => (this.failed() ? null : this.image() || null));

  protected measureTitle(element: HTMLElement): void {
    const cut = element.scrollHeight > element.clientHeight + 1;
    this.cutTitle.set(cut ? (element.textContent ?? '').trim() : '');
  }
}
