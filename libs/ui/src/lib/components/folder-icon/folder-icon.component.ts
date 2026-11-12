import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
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
    '[class]': "'ui-folder-icon--' + colour()",
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  template: '<ui-icon [name]="icon()" [size]="glyphSize()" />',
  styleUrl: './folder-icon.component.scss',
})
export class FolderIconComponent {
  protected readonly FOLDER_ICON_SIZE = FOLDER_ICON_SIZE;

  /** Glyph from the Shelfmark icon set. */
  readonly icon = input<IconName>('folder');
  /** The person's colour choice; graphite by default. */
  readonly colour = input<FolderColour>(FOLDER_COLOUR.Graphite);
  readonly size = input<FolderIconSize>(FOLDER_ICON_SIZE.Md);
  /** Accessible name; leave empty when the folder name is next to the tile. */
  readonly label = input<string>();

  protected readonly glyphSize = computed(() => FOLDER_GLYPH_SIZE[this.size()]);
}
