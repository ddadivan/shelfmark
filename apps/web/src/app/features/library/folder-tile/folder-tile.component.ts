import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { FolderResponse } from '@shelfmark/contracts';
import { FolderIconComponent, ICON_SIZE, IconComponent } from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { APP_PATH } from '../../../models/app-path.const';

/**
 * A subfolder in the content of a folder view: a compact tile (cards) or a full-width row (list)
 * with the folder icon, the name, "12 links, 2 subfolders" and a chevron. The whole tile is one
 * link to the folder route, so keyboard, middle click and "open in new tab" work. The tile wears the
 * folder's colour and icon (graphite while "Folder colours" is off).
 */
@Component({
  selector: 'app-folder-tile',
  imports: [FolderIconComponent, IconComponent, RouterLink, TranslocoPipe],
  templateUrl: './folder-tile.component.html',
  styleUrl: './folder-tile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.folder-tile--row]': 'row()',
    '[class.folder-tile--drop]': 'dropTarget()',
    // `LINK_DROP_ATTRIBUTE`, hit-tested by `LinkDragService`: a dragged link can be dropped here.
    '[attr.data-link-drop-folder]': 'folder().id',
  },
})
export class FolderTileComponent {
  readonly folder = input.required<FolderResponse>();
  /** Number of folders directly inside this one. */
  readonly childCount = input(0);
  /** The list view: a full-width row instead of a tile. */
  readonly row = input(false);
  /** A dragged link is over this tile: it is highlighted as the drop target. */
  readonly dropTarget = input(false);

  protected readonly settings = inject(UserSettingsStore);
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly pluralKey = pluralKey;
  protected readonly commands = computed(() => ['/', APP_PATH.Folders, this.folder().id]);
}
