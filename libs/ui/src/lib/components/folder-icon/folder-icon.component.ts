import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import type { IconName } from '../icon/models/icon-name.type';
import { folderColourShades } from '../../utils/folder-colour/folder-colour';
import { FOLDER_COLOUR } from './models/folder-colour.const';
import type { FolderColour } from './models/folder-colour.type';
import { FOLDER_GLYPH_SIZE } from './models/folder-glyph-size.const';
import { FOLDER_ICON_SIZE } from './models/folder-icon-size.const';
import type { FolderIconSize } from './models/folder-icon-size.type';

/**
 * The coloured tile that stands for a folder (sidebar, folder tiles, menus, toasts). The tile
 * takes `folder-<colour>-bg`, the glyph `folder-<colour>` (4.5:1 in both themes). Decorative
 * (`aria-hidden`) unless `label` is set, which makes it `role="img"` with that name.
 */
@Component({
  selector: 'ui-folder-icon',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-folder-icon',
    '[class.ui-folder-icon--sm]': 'size() === FOLDER_ICON_SIZE.Sm',
    '[class.ui-folder-icon--md]': 'size() === FOLDER_ICON_SIZE.Md',
    '[class.ui-folder-icon--lg]': 'size() === FOLDER_ICON_SIZE.Lg',
    '[class.ui-folder-icon--xl]': 'size() === FOLDER_ICON_SIZE.Xl',
    '[class]': "ownShades() ? 'ui-folder-icon--own' : 'ui-folder-icon--' + colour()",
    '[style.--ui-folder-icon-tile-light]': 'ownShades()?.light?.tile ?? null',
    '[style.--ui-folder-icon-glyph-light]': 'ownShades()?.light?.glyph ?? null',
    '[style.--ui-folder-icon-tile-dark]': 'ownShades()?.dark?.tile ?? null',
    '[style.--ui-folder-icon-glyph-dark]': 'ownShades()?.dark?.glyph ?? null',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  template: `
    @if (glyph(); as name) {
      <ui-icon [name]="name" [size]="glyphSize()" />
    } @else {
      <span class="ui-folder-icon__emoji" aria-hidden="true">{{ icon() }}</span>
    }
  `,
  styleUrl: './folder-icon.component.scss',
})
export class FolderIconComponent {
  protected readonly FOLDER_ICON_SIZE = FOLDER_ICON_SIZE;

  /** Glyph from the Shelfmark icon set, or a single emoji (#335; drawn as text, decorative). */
  readonly icon = input<IconName | string>('folder');
  /** The person's colour choice (a `FolderColour` or an own `#rrggbb`); graphite by default. */
  readonly colour = input<FolderColour | string>(FOLDER_COLOUR.Graphite);
  readonly size = input<FolderIconSize>(FOLDER_ICON_SIZE.Md);
  /** Accessible name; leave empty when the folder name is next to the tile. */
  readonly label = input<string>();

  /** The sprite icon, or `null` when `icon` is an emoji. */
  protected readonly glyph = computed<IconName | null>(
    () => ICON_NAMES.find((name) => name === this.icon()) ?? null,
  );
  /** Tile and glyph colours of an own colour on both bases; `null` for a built-in colour. */
  protected readonly ownShades = computed(() => folderColourShades(this.colour()));
  protected readonly glyphSize = computed(() => FOLDER_GLYPH_SIZE[this.size()]);
}
