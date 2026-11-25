import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';

/**
 * A tile that is one link (Shelf 17-help: topic tiles, related and previous / next articles, search
 * results): a hairline card on `surface` with `radius-card` corners, or `flat` (no card, a result
 * row with a `fill` hover). One native `<a>` holds everything, so the tile has one tab stop and its
 * text names it. Slots (`slot="..."` attributes): `eyebrow` (a 12px muted line above), `heading`
 * (16px 600) and `text` (14px muted below); an empty slot takes no room. `icon` draws a 40px
 * `fill` tile before the text. `end` right-aligns the text (a "Next" tile).
 *
 * `href` is a real address: a plain click emits `activated` (call `preventDefault()` to route in
 * the app), middle and Cmd / Ctrl click keep the browser's own behaviour. `newTab` opens it in a
 * new tab with `noopener noreferrer`. Hover (pointer devices only) is `shadow-hover` on a card
 * (none in dark) and `fill` on a flat tile; the focus ring is the global one.
 */
@Component({
  selector: 'ui-link-tile',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-link-tile',
    '[class.ui-link-tile--flat]': 'flat()',
    '[class.ui-link-tile--end]': 'end()',
  },
  templateUrl: './link-tile.component.html',
  styleUrl: './link-tile.component.scss',
})
export class LinkTileComponent {
  /** Where the tile leads. */
  readonly href = input.required<string>();
  /** Opens the address in a new tab. */
  readonly newTab = input(false, { transform: booleanAttribute });
  /** A 40px icon tile before the text. */
  readonly icon = input<IconName>();
  /** No card: a result row. */
  readonly flat = input(false, { transform: booleanAttribute });
  /** Right-aligned text. */
  readonly end = input(false, { transform: booleanAttribute });

  /** A plain click on the link. */
  readonly activated = output<MouseEvent>();
}
