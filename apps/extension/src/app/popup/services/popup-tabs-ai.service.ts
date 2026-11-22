import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import {
  AI_JOB_REASON,
  AI_JOB_STATUS,
  LINK_LIMIT,
  normalizeTagName,
  SUGGESTION_KIND,
  type AiJobResponse,
  type CreateAiDraftRequest,
} from '@shelfmark/contracts';
import { ShelfmarkApiService } from '../../core/api/shelfmark-api.service';
import { AI_FILL_STATE } from '../models/ai-fill-state.const';
import type { AiFillState } from '../models/ai-fill-state.type';
import { AI_LINE_KIND } from '../models/ai-line-kind.const';
import type { AiLineView } from '../models/ai-line.interface';
import { AI_POLL_INTERVAL_MS } from '../models/ai-poll-interval-ms.const';
import type { BatchItemPick } from '../models/batch-item-pick.interface';
import { TAB_AI_STATUS } from '../models/tab-ai-status.const';
import type { TabAiRow } from '../models/tab-ai-row.interface';
import type { TabAiTag } from '../models/tab-ai-tag.interface';
import type { TabEntry } from '../models/tab-entry.interface';
import { TABS_AI_MAX } from '../models/tabs-ai-max.const';
import { TABS_AI_POLL_MAX_MS } from '../models/tabs-ai-poll-max-ms.const';
import { TABS_AI_POLL_SPACING_MS } from '../models/tabs-ai-poll-spacing-ms.const';
import { TABS_AI_TAGS_MAX } from '../models/tabs-ai-tags-max.const';
import type { TabsAiTarget } from '../models/tabs-ai-target.interface';
import { TABS_REQUEST_CONCURRENCY } from '../models/tabs-request-concurrency.const';
import { mapLimit } from '../utils/map-limit';
import { withoutFragment } from '../utils/without-fragment';
import { PopupAiFillService } from './popup-ai-fill.service';
import { PopupTabsService } from './popup-tabs.service';

const NO_ROW: TabAiRow = { status: TAB_AI_STATUS.None, draftId: null, folderId: null, tags: [] };

/**
 * "Sort N links with AI" of the popup's All tabs mode (#569, only while AI is on, like "Fill in with
 * AI"). Nothing leaves the browser for AI until the click; then one `POST /api/ai/drafts` per ticked
 * tab (its own `draftId`, the address and the tab title), polled in rounds like the single fill. Each
 * tab gets its own existing folder and one or two tags. A tab ticked afterwards has none and takes the
 * Folder field's folder. When the monthly allowance runs out the rest keep the shared folder and the
 * quiet limit line says so. Save sends each tab's `aiDraftId`.
 */
@Service()
export class PopupTabsAiService {
  private readonly api = inject(ShelfmarkApiService);
  private readonly ai = inject(PopupAiFillService);
  private readonly tabs = inject(PopupTabsService);
  private target: TabsAiTarget | null = null;

  readonly state = signal<AiFillState>(AI_FILL_STATE.Idle);
  private readonly rows = signal<ReadonlyMap<string, TabAiRow>>(new Map());
  private readonly overrides = signal<ReadonlyMap<string, string>>(new Map());
  private readonly keepPicks = signal(false);
  private readonly quotaHit = signal(false);

  readonly busy = computed(() => this.state() === AI_FILL_STATE.Loading);
  /** Tabs one click sorts: the ticked ones, at most `TABS_AI_MAX`. */
  readonly sortCount = computed(() => Math.min(this.tabs.selectedCount(), TABS_AI_MAX));
  /** The button: AI on, All tabs, until a sort produced picks (a second press would do nothing). */
  readonly buttonShown = computed(
    () => this.ai.on() && this.tabs.active() && this.state() !== AI_FILL_STATE.Ready,
  );
  /** Some tab was sorted. */
  readonly sorted = computed(() => this.state() === AI_FILL_STATE.Ready);
  /** The Folder field says "Picked by AI for each link": each link keeps its own AI folder. */
  readonly picksActive = computed(() => this.sorted() && this.keepPicks());
  /** The quiet line: the allowance ran out, or the sort failed. */
  readonly line = computed<AiLineView | null>(() => {
    if (!this.ai.on()) return null;
    if (this.quotaHit()) return this.ai.limitLine();
    return this.state() === AI_FILL_STATE.Unavailable ? { kind: AI_LINE_KIND.Unavailable } : null;
  });

  attach(target: TabsAiTarget): void {
    this.target = target;
  }

  /** The AI row of a tab that was sorted. */
  row(key: string): TabAiRow | undefined {
    return this.rows().get(key);
  }

  /** The folder a tab is saved to as far as AI and the user decided; `null` = the shared Folder field. */
  ownFolder(key: string): string | null {
    const override = this.overrides().get(key);
    if (override !== undefined) return override;
    const row = this.rows().get(key);
    return this.keepPicks() && row?.status === TAB_AI_STATUS.Done ? row.folderId : null;
  }

  /** The folder shown on the row's chip: its own, else the shared one (`null` is Unsorted). */
  shownFolder(key: string): string | null {
    return this.ownFolder(key) ?? this.target?.folderId() ?? null;
  }

  /** The user picks a folder for one link. */
  setFolder(key: string, folderId: string): void {
    this.overrides.update((map) => new Map(map).set(key, folderId));
  }

  /** A folder chosen for all links: every link goes there (AI tags stay). */
  useSharedFolder(): void {
    this.keepPicks.set(false);
    this.overrides.set(new Map());
  }

  /** "Keep AI picks" in the picker: each link its own AI folder again. */
  keepAiPicks(): void {
    this.keepPicks.set(true);
    this.overrides.set(new Map());
  }

  /** What the batch needs for one ticked tab. */
  pick(entry: TabEntry): BatchItemPick {
    const row = this.rows().get(entry.key);
    return {
      draftId: row?.draftId ?? null,
      folderId: this.ownFolder(entry.key),
      tags: row?.status === TAB_AI_STATUS.Done ? row.tags.map((tag) => tag.name) : [],
    };
  }

  /** The click. */
  async sort(): Promise<void> {
    if (!this.ai.on() || this.busy() || this.sorted()) return;
    const targets = this.tabs.selected().slice(0, TABS_AI_MAX);
    if (targets.length === 0) return;
    this.state.set(AI_FILL_STATE.Loading);
    this.quotaHit.set(false);
    for (const entry of targets) {
      const kept = this.rows().get(entry.key)?.draftId ?? null;
      this.setRow(entry.key, { ...NO_ROW, status: TAB_AI_STATUS.Working, draftId: kept });
    }
    const waiting = new Map<string, string>();
    let failed = false;
    await mapLimit(targets, TABS_REQUEST_CONCURRENCY, async (entry) => {
      if (this.quotaHit()) {
        this.finishRow(entry.key, TAB_AI_STATUS.None);
        return;
      }
      const draftId = this.rows().get(entry.key)?.draftId ?? crypto.randomUUID();
      this.setRow(entry.key, { ...NO_ROW, status: TAB_AI_STATUS.Working, draftId });
      try {
        const job = await this.api.createAiDraft(this.request(draftId, entry));
        if (this.take(entry.key, job)) waiting.set(entry.key, job.id);
      } catch {
        failed = true;
        this.setRow(entry.key, NO_ROW);
      }
    });
    failed = (await this.poll(waiting)) || failed;
    this.settle(failed);
  }

  /** Polls the unfinished jobs in rounds, spaced by the number of jobs, until all end or time is up. */
  private async poll(waiting: Map<string, string>): Promise<boolean> {
    const started = Date.now();
    let failed = false;
    while (waiting.size > 0 && Date.now() - started < TABS_AI_POLL_MAX_MS) {
      const spacing = Math.max(AI_POLL_INTERVAL_MS, waiting.size * TABS_AI_POLL_SPACING_MS);
      await new Promise<void>((resolve) => setTimeout(resolve, spacing));
      await mapLimit([...waiting], TABS_REQUEST_CONCURRENCY, async ([key, id]) => {
        try {
          const job = await this.api.aiJob(id);
          if (!this.take(key, job)) waiting.delete(key);
        } catch (error: unknown) {
          // A rate limit is not a failure: the job is asked again next round, within the overall wait.
          if (
            error instanceof HttpErrorResponse &&
            error.status === HttpStatusCode.TooManyRequests
          ) {
            return;
          }
          failed = true;
          waiting.delete(key);
          this.finishRow(key, TAB_AI_STATUS.None);
        }
      });
    }
    // Too slow: the tab saves without suggestions, the server finishes its draft for the link.
    for (const key of waiting.keys()) this.finishRow(key, TAB_AI_STATUS.None);
    return failed;
  }

  private settle(failed: boolean): void {
    const anyDone = [...this.rows().values()].some((row) => row.status === TAB_AI_STATUS.Done);
    if (anyDone) {
      this.keepPicks.set([...this.rows().values()].some((row) => row.folderId !== null));
      this.state.set(AI_FILL_STATE.Ready);
    } else if (this.quotaHit()) {
      this.state.set(AI_FILL_STATE.Quota);
    } else {
      this.state.set(failed ? AI_FILL_STATE.Unavailable : AI_FILL_STATE.Hidden);
    }
  }

  /** Reads a job into the tab's row; answers whether the job is still pending. */
  private take(key: string, job: AiJobResponse): boolean {
    if (job.status === AI_JOB_STATUS.Pending) return true;
    if (job.status === AI_JOB_STATUS.Done) {
      this.finishRow(key, TAB_AI_STATUS.Done, this.suggestions(job));
    } else {
      if (job.reason === AI_JOB_REASON.Quota) this.quotaHit.set(true);
      this.finishRow(key, TAB_AI_STATUS.None);
    }
    return false;
  }

  private suggestions(job: AiJobResponse): Pick<TabAiRow, 'folderId' | 'tags'> {
    const folders = this.target?.folders() ?? [];
    const folder = job.suggestions.find((item) => item.kind === SUGGESTION_KIND.Folder);
    const folderId =
      folder?.folderId != null && folders.some((candidate) => candidate.id === folder.folderId)
        ? folder.folderId
        : null;
    const seen = new Set<string>();
    const tags: TabAiTag[] = [];
    for (const item of job.suggestions) {
      if (item.kind === SUGGESTION_KIND.Folder || item.tagName === null || item.more === true) {
        continue;
      }
      const name = normalizeTagName(item.tagName);
      if (name === '' || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      tags.push({ name, isNew: item.kind === SUGGESTION_KIND.NewTag });
    }
    return { folderId, tags: tags.slice(0, Math.min(TABS_AI_TAGS_MAX, LINK_LIMIT.TagsMax)) };
  }

  private finishRow(
    key: string,
    status: TabAiRow['status'],
    fields: Pick<TabAiRow, 'folderId' | 'tags'> = { folderId: null, tags: [] },
  ): void {
    const draftId = this.rows().get(key)?.draftId ?? null;
    this.setRow(key, { status, draftId, ...fields });
  }

  private setRow(key: string, row: TabAiRow): void {
    this.rows.update((map) => new Map(map).set(key, row));
  }

  private request(draftId: string, entry: TabEntry): CreateAiDraftRequest {
    // A generic tab title ("YouTube") is not sent: the server reads the video's own (oEmbed).
    const title = entry.titleFromTab ? entry.title.trim().slice(0, LINK_LIMIT.TitleMax) : '';
    return {
      draftId,
      url: withoutFragment(entry.url),
      ...(title !== '' && { title }),
    };
  }
}
