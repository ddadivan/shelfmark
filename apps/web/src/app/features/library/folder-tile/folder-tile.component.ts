import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { FolderResponse } from '@shelfmark/contracts';
import { ICON_SIZE, IconComponent } from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { APP_PATH } from '../../../models/app-path.const';

/**
 * A subfolder in the content of a folder view: a compact tile (cards) or a full-width row (list)
 * with the folder icon, the name, "12 links, 2 subfolders" and a chevron. The whole tile is one
 * link to the folder route, so keyboard, middle click and "open in new tab" work.
 */
@Component({
  selector: 'app-folder-tile',
  imports: [IconComponent, RouterLink, TranslocoPipe],
  templateUrl: './folder-tile.component.html',
  styleUrl: './folder-tile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.folder-tile--row]': 'row()' },
})
export class FolderTileComponent {
  readonly folder = input.required<FolderResponse>();
  /** Number of folders directly inside this one. */
  readonly childCount = input(0);
  /** The list view: a full-width row instead of a tile. */
  readonly row = input(false);

  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly pluralKey = pluralKey;
  protected readonly commands = computed(() => ['/', APP_PATH.Folders, this.folder().id]);
}
