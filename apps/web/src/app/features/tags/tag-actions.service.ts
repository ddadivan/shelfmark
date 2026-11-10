import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { normalizeTagName, type TagResponse } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { APP_PATH } from '../../models/app-path.const';
import { TAG_OUTCOME } from '../../stores/models/tag-outcome.const';
import { TagsStore } from '../../stores/tags.store';
import { pluralKey } from '../../core/i18n/plural-key';
import { UndoToastService } from '../../core/undo/undo-toast.service';
import type { MergeTagDialogData } from './models/merge-tag-dialog-data.interface';
import { TAG_QUERY_PARAM } from './models/tag-query-param.const';
import { MergeTagDialogComponent } from './merge-tag-dialog/merge-tag-dialog.component';

/**
 * What a user can do with a tag from the sidebar and the filter row: show its links, merge,
 * delete (confirm, then Undo for 8 seconds) and keep the open `?tag=` filter pointing at tags
 * that still exist. Dialogs and texts live here, so components only call.
 */
@Service()
export class TagActionsService {
  private readonly tags = inject(TagsStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly undoToast = inject(UndoToastService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  /** Lists the links with this tag (all links, filtered by the tag). */
  async showLinks(name: string): Promise<void> {
    await this.router.navigate([`/${APP_PATH.Links}`], {
      queryParams: { [TAG_QUERY_PARAM]: [name] },
    });
  }

  /** Asks for the target in a dialog, then merges `tag` into it. */
  async merge(tag: TagResponse): Promise<void> {
    await this.dialogs.open<MergeTagDialogComponent, boolean, MergeTagDialogData>(
      MergeTagDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        data: {
          tag,
          // The toast and the filter follow here, not after the dialog: closing it (Esc, backdrop)
          // while the request runs must not skip them.
          submit: async (targetId) => {
            const result = await this.tags.merge(tag.id, targetId);
            if (result.outcome !== TAG_OUTCOME.Done || !result.tag) {
              return false;
            }
            this.mergedInto(tag, result.tag);
            return true;
          },
        },
      },
    ).result;
  }

  /** Merges without a dialog (the offer after a rename hit an existing name). */
  async mergeInto(tag: TagResponse, target: TagResponse): Promise<boolean> {
    const result = await this.tags.merge(tag.id, target.id);
    if (result.outcome === TAG_OUTCOME.Done) {
      this.mergedInto(tag, result.tag ?? target);
      return true;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.t('tags.merge.failedTitle'),
      detail: this.t('tags.merge.failedDetail'),
    });
    return false;
  }

  /** The new name of a renamed tag replaces the old one in the open filter. */
  renamed(from: string, to: string): void {
    void this.retargetFilter(from, to);
  }

  /** Confirms with the link count, hides the tag and offers Undo; the request goes out when the window ends. */
  async delete(tag: TagResponse): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: this.t('tags.delete.title', { name: tag.name }),
      message: this.t(pluralKey('tags.delete.message', tag.linkCount), {
        count: String(tag.linkCount),
      }),
      confirmLabel: this.t('tags.delete.confirm'),
      cancelLabel: this.t('tags.dialog.cancel'),
      closeLabel: this.t('tags.dialog.close'),
      destructive: true,
    });
    if (!confirmed || !this.tags.hide(tag.id)) {
      return;
    }
    this.undoToast.show({
      title: this.t('tags.delete.done', { name: tag.name }),
      actionLabel: this.t('tags.delete.undo'),
      onUndo: () => this.tags.undoRemove(tag.id),
      onExpire: () => void this.commitDelete(tag),
    });
  }

  private async commitDelete(tag: TagResponse): Promise<void> {
    if (await this.tags.commitRemove(tag.id)) {
      await this.retargetFilter(tag.name, null);
    } else {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('tags.delete.failed', { name: tag.name }),
        detail: this.t('tags.delete.failedDetail'),
      });
    }
  }

  private mergedInto(source: TagResponse, target: TagResponse): void {
    this.toasts.show({
      kind: TOAST_KIND.Success,
      title: this.t('tags.merge.done', { name: source.name, target: target.name }),
    });
    void this.retargetFilter(source.name, target.name);
  }

  /** Points the `?tag=` filter of the open page at `to` (`null` removes it) when it has `from`. */
  private async retargetFilter(from: string, to: string | null): Promise<void> {
    // The URL may spell a tag differently (spaces, case); compare the way the filter reads it.
    const current = this.router
      .parseUrl(this.router.url)
      .queryParamMap.getAll(TAG_QUERY_PARAM)
      .map((name) => normalizeTagName(name));
    const same = (name: string): boolean =>
      name.toLowerCase() === normalizeTagName(from).toLowerCase();
    if (!current.some(same)) {
      return;
    }
    const seen = new Set<string>();
    const next: string[] = [];
    for (const name of current) {
      const mapped = same(name) ? to : name;
      if (mapped !== null && !seen.has(mapped.toLowerCase())) {
        seen.add(mapped.toLowerCase());
        next.push(mapped);
      }
    }
    await this.router.navigate([], {
      queryParams: { [TAG_QUERY_PARAM]: next.length > 0 ? next : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
