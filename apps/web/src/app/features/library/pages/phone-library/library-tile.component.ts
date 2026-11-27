import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ICON_SIZE, IconComponent, type IconName } from '@shelfmark/ui';
import { isPlainLeftClick } from '../../../../core/layout/utils/is-plain-left-click';

/**
 * A tile of the phone Library page (MobileMenu): icon, name and a count line on a card. One link
 * to `href`. With `popup` a plain click does not navigate but emits `activated` (the app opens a
 * sheet), while middle click and "open in new tab" still go to `href`.
 */
@Component({
  selector: 'app-library-tile',
  imports: [IconComponent, NgTemplateOutlet, RouterLink],
  templateUrl: './library-tile.component.html',
  styleUrl: './library-tile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryTileComponent {
  readonly href = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  /** The second line; hidden while empty (the count has not loaded yet). */
  readonly meta = input<string>();
  /** The second line is in the accent tone: something waits behind the tile ("5 forgotten"). */
  readonly attention = input(false, { transform: booleanAttribute });
  /** The icon is sage: the favorites star. */
  readonly accent = input(false, { transform: booleanAttribute });
  /** A plain click opens something over the page (a sheet) instead of navigating. */
  readonly popup = input(false, { transform: booleanAttribute });
  readonly activated = output<void>();

  protected readonly ICON_SIZE = ICON_SIZE;

  protected open(event: MouseEvent): void {
    if (!isPlainLeftClick(event)) {
      return;
    }
    event.preventDefault();
    this.activated.emit();
  }
}
