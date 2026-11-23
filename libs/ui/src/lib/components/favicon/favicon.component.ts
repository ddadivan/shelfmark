import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { contrastRatio, parseHex } from '../../utils/colour-contrast/colour-contrast';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/** Letter colours on a site colour: white, or black when white would be under 3:1. */
const INK_LIGHT = '#ffffff';
const INK_DARK = '#000000';
const MIN_INK_CONTRAST = 3;

/**
 * The site's small icon, 16 px in a `radius-xs` square. With `colour` (a `#rrggbb` from the app)
 * the square is filled with it and carries a white letter (black when the colour is light, so
 * the letter keeps 3:1); without it the tile is `surface-hover`. Shows `src` when it loads; without
 * `src`, or when the image fails (the CSP blocks external hosts in stage 1), it shows `letter`
 * (the site's first letter) and, without a letter, the link icon in `text-muted`. The box has a
 * fixed size, so a failed or late image never shifts the layout. The image is bound as `src`
 * only, lazy (`loading="lazy"`, `decoding="async"`) and sent with `referrerpolicy="no-referrer"`.
 * The app CSP is `img-src 'self' data:`, so external favicons are blocked and the letter or
 * icon shows until stage 3 decides on an image proxy or a CSP change (see the image-sources
 * issue #57 in milestone 3).
 * Always decorative (`aria-hidden`): the domain next to it is the text.
 */
@Component({
  selector: 'ui-favicon',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-favicon',
    'aria-hidden': 'true',
    '[class.ui-favicon--coloured]': 'shades() !== null',
    '[style.--ui-favicon-bg]': 'shades()?.fill ?? null',
    '[style.--ui-favicon-ink]': 'shades()?.ink ?? null',
  },
  templateUrl: './favicon.component.html',
  styleUrl: './favicon.component.scss',
})
export class FaviconComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  /** Image URL of the site's icon. */
  readonly src = input<string>();
  /** Fallback letter; only the first character is shown. Without it the link icon is shown. */
  readonly letter = input<string>();

  /**
   * The site's own colour as `#rrggbb`. Fills the square behind the letter; ignored for anything
   * else, and never visible behind a loaded image. Set through CSSOM (custom properties), so it
   * needs no `style` attribute.
   */
  readonly colour = input<string>();

  /** Fill and letter colour of `colour`; `null` without a valid one. */
  protected readonly shades = computed(() => {
    const fill = this.colour()?.trim();
    if (!fill || !parseHex(fill)) {
      return null;
    }
    const ink = contrastRatio(fill, INK_LIGHT) >= MIN_INK_CONTRAST ? INK_LIGHT : INK_DARK;
    return { fill, ink };
  });

  /** Set when the current `src` failed to load; resets when `src` changes. */
  protected readonly failed = linkedSignal<string | undefined, boolean>({
    source: this.src,
    computation: () => false,
  });

  protected readonly imageSrc = computed(() => (this.failed() ? null : this.src() || null));
  protected readonly initial = computed(() => Array.from(this.letter()?.trim() ?? '')[0] ?? '');
}
