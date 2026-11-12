import { computed, inject, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import type { BulkBarAction } from '@shelfmark/ui';
import { ViewportService } from '../../../core/layout/viewport.service';
import { BULK_ACTION } from '../../links/models/bulk-action.const';
import { BulkLinkActionsService } from '../../links/services/bulk-link-actions.service';
import { LibrarySelectionService } from './library-selection.service';

/**
 * The bulk bar of the library page: its buttons for the picked links (the phone shares instead
 * of opening all) and running one of them, which may end the selection afterwards.
 * Page-scoped: the page provides it.
 */
@Service({ autoProvided: false })
export class LibraryBulkService {
  private readonly links = inject(BulkLinkActionsService);
  private readonly selection = inject(LibrarySelectionService);
  private readonly transloco = inject(TranslocoService);
  private readonly compact = inject(ViewportService).compact;

  private readonly i18n = toSignal(this.transloco.selectTranslation());
  /** The bulk bar: desktop Move, Tags, Favorite, Open all, Copy links, Delete; the phone shares instead of opening. */
  readonly barActions = computed<BulkBarAction[]>(() => {
    this.i18n();
    const t = (key: string): string => this.transloco.translate(key);
    const favorite =
      this.selection.selecting() && this.selection.selectedLinks().every((link) => link.isFavorite);
    const actions: BulkBarAction[] = [
      { id: BULK_ACTION.Move, label: t('bulk.bar.move'), icon: 'folder-move' },
      { id: BULK_ACTION.Tags, label: t('bulk.bar.tags'), icon: 'tag' },
      {
        id: BULK_ACTION.Favorite,
        label: t('bulk.bar.favorite'),
        icon: favorite ? 'star-filled' : 'star',
        pressed: favorite,
      },
    ];
    if (this.compact()) {
      actions.push(
        this.links.canShare()
          ? { id: BULK_ACTION.Share, label: t('bulk.bar.share'), icon: 'share' }
          : { id: BULK_ACTION.Copy, label: t('bulk.bar.copy'), icon: 'copy' },
      );
    } else {
      actions.push(
        { id: BULK_ACTION.OpenAll, label: t('bulk.bar.openAll'), icon: 'external' },
        { id: BULK_ACTION.Copy, label: t('bulk.bar.copy'), icon: 'copy' },
      );
    }
    actions.push({
      id: BULK_ACTION.Delete,
      label: t('bulk.bar.delete'),
      icon: 'trash',
      danger: true,
    });
    return actions;
  });

  /** A bulk bar button: runs the action on the picked links; some clear the selection afterwards. */
  async run(id: string): Promise<void> {
    const links = this.selection.selectedLinks();
    let clear = false;
    switch (id) {
      case BULK_ACTION.Move:
        clear = await this.links.move(links);
        break;
      case BULK_ACTION.Tags:
        clear = await this.links.editTags(links);
        break;
      case BULK_ACTION.Favorite:
        clear = await this.links.toggleFavorite(links);
        break;
      case BULK_ACTION.OpenAll:
        clear = await this.links.openAll(links);
        break;
      case BULK_ACTION.Copy:
        clear = await this.links.copy(links);
        break;
      case BULK_ACTION.Share:
        clear = await this.links.share(links);
        break;
      case BULK_ACTION.Delete:
        clear = await this.links.delete(links);
        break;
    }
    if (clear) {
      this.selection.clear();
    }
  }
}
