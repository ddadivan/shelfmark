import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { FolderResponse } from '@shelfmark/contracts';
import {
  BADGE_TONE,
  BadgeComponent,
  CHIP_VARIANT,
  ChipComponent,
  CheckboxComponent,
  FaviconComponent,
  FolderIconComponent,
  IconComponent,
  ICON_SIZE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { TAB_AI_STATUS } from '../../models/tab-ai-status.const';
import type { TabEntry } from '../../models/tab-entry.interface';
import { PopupStore } from '../../popup.store';

/**
 * The tab list of All tabs (#569): "Select all" with the count, then one row per tab (tick, favicon
 * letter, title, host, a "Saved" badge). After "Sort with AI" a row has a third line: the AI spark,
 * its folder (a tap picks another one for that link) and one or two tags. Only the list scrolls.
 */
@Component({
  selector: 'ext-popup-tab-list',
  templateUrl: './popup-tab-list.component.html',
  styleUrl: './popup-tab-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.aria-busy]': 'store.tabList.loading()' },
  imports: [
    BadgeComponent,
    CheckboxComponent,
    ChipComponent,
    FaviconComponent,
    FolderIconComponent,
    IconComponent,
    SkeletonComponent,
    TranslocoPipe,
  ],
})
export class PopupTabListComponent {
  protected readonly store = inject(PopupStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly CHIP_VARIANT = CHIP_VARIANT;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly TAB_AI_STATUS = TAB_AI_STATUS;

  protected readonly locked = computed(() => this.store.saving() || this.store.tabsAi.busy());
  protected readonly selectedLabel = computed(() =>
    this.transloco.translate('popup.tabs.selected', {
      selected: this.store.tabList.selectedCount(),
      total: this.store.tabList.entries().length,
    }),
  );

  /** The folder on a sorted row's chip (`null`: Unsorted). */
  protected folderOf(entry: TabEntry): FolderResponse | null {
    const id = this.store.tabsAi.shownFolder(entry.key);
    return id === null ? null : (this.store.folders().find((folder) => folder.id === id) ?? null);
  }

  protected folderName(entry: TabEntry): string {
    return this.folderOf(entry)?.name ?? this.transloco.translate('popup.unsorted');
  }

  protected changeFolderLabel(entry: TabEntry): string {
    return this.transloco.translate('popup.tabs.changeFolder', { folder: this.folderName(entry) });
  }

  /** The state of the row's AI line while the tab is ticked: `null` when it shows nothing. */
  protected aiStatus(entry: TabEntry): string | null {
    if (!this.store.tabList.isTicked(entry.key)) return null;
    const status = this.store.tabsAi.row(entry.key)?.status;
    return status === TAB_AI_STATUS.None ? null : (status ?? null);
  }
}
