import { inject, Injector, Service } from '@angular/core';
import {
  AI_APPLIED_PART,
  AI_FEATURE_MODE,
  AI_JOB_STATUS,
  AI_LIMIT,
  type AiAutoApplied,
  type LinkAiState,
  type LinkResponse,
} from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { pluralKey } from '../../../core/i18n/plural-key';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { LibraryRefreshService } from '../../../stores/library-refresh.service';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { LINKS_API } from '../../links/models/links-api.const';
import { toastFolder } from '../../links/utils/toast-folder';
import { AI_API } from '../models/ai-api.const';
import { AI_BATCH_FOLLOW_UP } from '../models/ai-batch-follow-up.const';
import { AI_POLL_INTERVAL_MS } from '../models/ai-poll-interval.const';
import { appliedSince } from '../utils/applied-since';
import { AiSettingsStore } from './ai-settings.store';
import { Translate } from '../../../core/i18n/translate.service';
import { UndoToastService } from '../../../core/undo/undo-toast.service';

/**
 * What happens after a save queued an AI job (#390 / #391): the AI tick learns of the job, and
 * `GET /api/links/:id/ai` is polled for `AI_LIMIT.PendingSkeletonMs` (the card's skeleton
 * window). When it is done the link in the feed gets its summary; when Automatic mode moved or
 * tagged it, the feed gets the link as saved and a toast names the change with Undo (8 s, `POST
 * /api/links/:id/ai/undo`). Past the window the summary appears on the next load. Links saved
 * together (paste many) share one loop that reloads the feed until none of them is pending. The
 * session end stops every poll.
 */
@Service()
export class AiFollowUpService {
  private readonly injector = inject(Injector);
  private readonly settings = inject(AiSettingsStore);
  private readonly links = inject(LinksStore);
  private readonly folders = inject(FoldersStore);
  private readonly userSettings = inject(UserSettingsStore);
  private readonly toasts = inject(ToastService);
  private readonly translate = inject(Translate);
  private readonly undoToast = inject(UndoToastService);
  private readonly watched = new Set<string>();
  /** Pending links of paste-many saves, followed by the one batch loop. */
  private readonly batch = new Set<string>();
  private batchUntil = 0;
  /** The running batch loop; `null` when none runs. */
  private batchLoop: object | null = null;
  private epoch = 0;

  constructor() {
    inject(SessionScope).onEnd(() => {
      this.epoch++;
      this.watched.clear();
      this.batch.clear();
      this.batchLoop = null;
    });
  }

  /**
   * Follows links saved together (paste many): their pending jobs reach the tick, and one loop at
   * a time reloads the feed every `AI_BATCH_FOLLOW_UP.RefreshMs` until none of them is pending in
   * it or the window (extended by each new batch) ends. No per-link polls, no toasts.
   */
  watchMany(links: readonly LinkResponse[]): void {
    const pending = links.filter(
      (link) => link.aiStatus === AI_JOB_STATUS.Pending && !this.watched.has(link.id),
    );
    if (pending.length === 0) {
      return;
    }
    for (const link of pending) {
      this.batch.add(link.id);
    }
    this.settings.jobQueued(pending.length);
    this.batchUntil = Date.now() + AI_BATCH_FOLLOW_UP.WindowMs;
    if (this.batchLoop === null) {
      const loop = {};
      this.batchLoop = loop;
      void this.followBatch(loop, this.epoch);
    }
  }

  /**
   * Follows a link that was just saved. A pending job is polled; a new link whose draft was
   * already done is asked once while an Automatic mode is on, so its change still gets the toast.
   */
  watch(link: LinkResponse, created = false): void {
    if (this.watched.has(link.id)) {
      return;
    }
    const pending = link.aiStatus === AI_JOB_STATUS.Pending;
    const automatic =
      this.settings.folderMode() === AI_FEATURE_MODE.Auto ||
      this.settings.tagsMode() === AI_FEATURE_MODE.Auto;
    if (!pending && !(created && automatic && link.aiStatus === AI_JOB_STATUS.Done)) {
      return;
    }
    this.watched.add(link.id);
    if (pending) {
      this.settings.jobQueued();
    }
    void this.follow(link, this.epoch, pending, created);
  }

  private async follow(
    link: LinkResponse,
    epoch: number,
    poll: boolean,
    created: boolean,
  ): Promise<void> {
    const until = Date.now() + AI_LIMIT.PendingSkeletonMs;
    const api = this.injector.get(AI_API);
    try {
      do {
        if (poll) {
          await new Promise((resolve) => setTimeout(resolve, AI_POLL_INTERVAL_MS));
        }
        if (epoch !== this.epoch) {
          return;
        }
        const state = await firstValueFrom(api.getLinkAi(link.id));
        if (epoch !== this.epoch) {
          return;
        }
        if (state.aiStatus !== AI_JOB_STATUS.Pending) {
          await this.settle(link, state, created);
          return;
        }
      } while (poll && Date.now() < until);
    } catch {
      // The link stays as saved; the next load shows what AI did.
    } finally {
      this.watched.delete(link.id);
    }
  }

  private async followBatch(loop: object, epoch: number): Promise<void> {
    try {
      while (Date.now() < this.batchUntil) {
        await new Promise((resolve) => setTimeout(resolve, AI_BATCH_FOLLOW_UP.RefreshMs));
        if (epoch !== this.epoch) {
          return;
        }
        // A link that left the feed, or is no longer pending in it, needs no more reloads.
        const shown = this.links.entityMap();
        for (const id of this.batch) {
          if (shown[id]?.aiStatus !== AI_JOB_STATUS.Pending) {
            this.batch.delete(id);
          }
        }
        if (this.batch.size === 0) {
          return;
        }
        this.links.refresh();
      }
    } finally {
      if (this.batchLoop === loop) {
        this.batchLoop = null;
        if (Date.now() >= this.batchUntil) {
          this.batch.clear();
        }
      }
    }
  }

  /**
   * Puts what AI did into the feed; an auto-applied change also brings the toast. After an edit
   * only what this follow-up applied counts: `autoApplied` also lists what AI applied before the
   * edit, which the saved link already shows (MUST-FIX 7).
   */
  private async settle(saved: LinkResponse, state: LinkAiState, created: boolean): Promise<void> {
    const current = this.links.entityMap()[saved.id] ?? saved;
    const withSummary: LinkResponse = {
      ...current,
      summary: state.summary,
      summarySource: state.summarySource,
      aiStatus: state.aiStatus,
    };
    const applied = created ? state.autoApplied : appliedSince(saved, state.autoApplied);
    if (!applied || (applied.folderId === null && applied.tags.length === 0)) {
      this.links.applyEdit(withSummary);
      return;
    }
    // Automatic mode changed the folder or tags: take the link as the server has it now.
    const fresh = await firstValueFrom(this.injector.get(LINKS_API).get(saved.id)).catch(
      () => withSummary,
    );
    this.links.applyEdit(fresh);
    this.injector.get(LibraryRefreshService).afterChange({ folders: true, tags: true });
    this.announce(fresh, applied);
  }

  private announce(link: LinkResponse, applied: AiAutoApplied): void {
    const undo = this.translate.t('ai.toast.undo');
    const moved = applied.folderId !== null;
    const folder = moved ? this.folders.entityMap()[applied.folderId ?? ''] : undefined;
    this.undoToast.show({
      kind: moved ? TOAST_KIND.Moved : TOAST_KIND.Success,
      title: moved
        ? this.translate.t('ai.toast.moved', { folder: folder?.name ?? '' })
        : this.translate.t(pluralKey('ai.toast.tagged', applied.tags.length), {
            count: applied.tags.length,
          }),
      detail: link.title,
      ...(moved && {
        folder: toastFolder(folder, (colour) => this.userSettings.shownColour(colour)),
      }),
      actionLabel: undo,
      onUndo: () => void this.undo(link, applied),
    });
  }

  /** Undo from the toast: every part AI applied goes back. */
  private async undo(link: LinkResponse, applied: AiAutoApplied): Promise<void> {
    const api = this.injector.get(AI_API);
    const parts = [
      ...(applied.folderId !== null ? [AI_APPLIED_PART.Folder] : []),
      ...(applied.tags.length > 0 ? [AI_APPLIED_PART.Tags] : []),
    ];
    try {
      let latest = link;
      for (const part of parts) {
        latest = await firstValueFrom(api.undoApply(link.id, { part }));
      }
      this.links.applyEdit(latest);
      this.injector.get(LibraryRefreshService).afterChange({ folders: true, tags: true });
    } catch {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('ai.applied.undoFailed'),
      });
    }
  }
}
