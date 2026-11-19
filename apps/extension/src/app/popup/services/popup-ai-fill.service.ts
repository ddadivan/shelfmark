import { computed, inject, Service, signal } from '@angular/core';
import {
  AI_JOB_REASON,
  AI_JOB_STATUS,
  AI_LIMIT,
  LINK_LIMIT,
  normalizeTagName,
  SUGGESTION_KIND,
  type AiJobResponse,
  type AiSettingsResponse,
  type CreateAiDraftRequest,
} from '@shelfmark/contracts';
import { ShelfmarkApiService } from '../../core/api/shelfmark-api.service';
import type { AiChip } from '../models/ai-chip.interface';
import { AI_FILL_STATE } from '../models/ai-fill-state.const';
import type { AiFillState } from '../models/ai-fill-state.type';
import type { AiFillTarget } from '../models/ai-fill-target.interface';
import { AI_LINE_KIND } from '../models/ai-line-kind.const';
import type { AiLineView } from '../models/ai-line.interface';
import { AI_POLL_INTERVAL_MS } from '../models/ai-poll-interval-ms.const';
import type { PageInfo } from '../models/page-info.interface';
import { withoutFragment } from '../utils/without-fragment';

/**
 * "Fill in with AI" of the popup (#503, F1c). Nothing leaves the browser for AI until the user
 * clicks the button: then `POST /api/ai/drafts` (the page address and title, the note only with
 * "Include my notes"), `GET /api/ai/jobs/:id` until the job is done or `AI_LIMIT.DraftPollMaxMs`
 * has passed (the save never waits), then the suggested folder (only while none is chosen) and all
 * suggested tags, new ones too, are put into the form next to the user's, and the cleaned-up page
 * title replaces the tab title that is sent on save. While it waits the popup locks folder and tags.
 * Save sends `draftId()` as `aiDraftId`. Without AI (off, no allowance, a failed settings call) nothing
 * here shows.
 */
@Service()
export class PopupAiFillService {
  private readonly api = inject(ShelfmarkApiService);
  private readonly settings = signal<AiSettingsResponse | null>(null);
  private readonly id = signal<string | null>(null);
  private readonly dismissed = signal<ReadonlySet<string>>(new Set());
  private readonly newTags = signal<readonly AiChip[]>([]);
  private readonly appliedFolder = signal<string | null>(null);
  private readonly appliedTags = signal<readonly string[]>([]);
  private readonly cleanTitleValue = signal<string | null>(null);
  private target: AiFillTarget | null = null;

  readonly state = signal<AiFillState>(AI_FILL_STATE.Idle);

  /** AI is on and the account has an allowance; only then anything AI shows. */
  readonly on = computed(() => {
    const settings = this.settings();
    return settings !== null && settings.settings.enabled && settings.usage.linksLimit > 0;
  });
  readonly busy = computed(() => this.state() === AI_FILL_STATE.Loading);
  /** The button shows while AI is on (the popup always has the tab's address). */
  readonly buttonShown = this.on;
  /** The cleaned-up title AI gave for the page, `null` until a fill applied one. */
  readonly cleanTitle = this.cleanTitleValue.asReadonly();
  /** New-tag chips that are still open, in the order AI gave them. */
  readonly chips = computed<readonly AiChip[]>(() => {
    const chosen = new Set(this.target?.chosenTags().map((tag) => tag.toLowerCase()));
    const hidden = this.dismissed();
    return this.newTags().filter(
      (chip) => !hidden.has(chip.id) && !chosen.has(chip.name.toLowerCase()),
    );
  });
  /** The spark mark: AI's folder is still the chosen one. */
  readonly folderMarked = computed(
    () => this.appliedFolder() !== null && this.target?.folderId() === this.appliedFolder(),
  );
  /** The spark mark: some tag AI added is still in the field. */
  readonly tagsMarked = computed(() => {
    const chosen = new Set(this.target?.chosenTags().map((tag) => tag.toLowerCase()));
    return this.appliedTags().some((name) => chosen.has(name.toLowerCase()));
  });
  /** The one quiet line: the monthly limit, or "not available right now". */
  readonly line = computed<AiLineView | null>(() => {
    if (!this.on()) return null;
    const state = this.state();
    if (state === AI_FILL_STATE.Quota) {
      const usage = this.settings()?.usage;
      return {
        kind: AI_LINE_KIND.Limit,
        resetsOn: usage?.resetsOn ?? '',
        limit: usage?.linksLimit ?? 0,
      };
    }
    return state === AI_FILL_STATE.Unavailable ? { kind: AI_LINE_KIND.Unavailable } : null;
  });
  /** The form was just filled in: the live region says so. */
  readonly filled = signal(false);

  /** Hands over the form values the fill reads and writes. */
  attach(target: AiFillTarget): void {
    this.target = target;
  }

  /** Reads the account's AI settings; any failure means "no AI" and the popup stays as before. */
  async load(): Promise<void> {
    try {
      this.settings.set(await this.api.aiSettings());
    } catch {
      this.settings.set(null);
    }
  }

  /** The `aiDraftId` of the save; `null` until a draft was asked for. */
  draftId(): string | null {
    return this.on() && this.state() !== AI_FILL_STATE.Idle ? this.id() : null;
  }

  /** The click: asks for the draft (again with the same id after "not available") and fills the form. */
  async fill(page: PageInfo): Promise<void> {
    if (!this.on() || this.busy() || this.state() === AI_FILL_STATE.Ready) return;
    const draftId = this.state() === AI_FILL_STATE.Unavailable ? this.id() : null;
    const id = draftId ?? crypto.randomUUID();
    this.id.set(id);
    this.state.set(AI_FILL_STATE.Loading);
    this.filled.set(false);
    const started = Date.now();
    try {
      let job = await this.api.createAiDraft(this.request(id, page));
      while (job.status === AI_JOB_STATUS.Pending) {
        if (Date.now() - started + AI_POLL_INTERVAL_MS > AI_LIMIT.DraftPollMaxMs) {
          // Too slow: the save goes without waiting, the server finishes the draft for the link.
          this.state.set(AI_FILL_STATE.Hidden);
          return;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, AI_POLL_INTERVAL_MS));
        job = await this.api.aiJob(job.id);
      }
      this.finish(job);
    } catch {
      this.state.set(AI_FILL_STATE.Unavailable);
    }
  }

  /** A taken new-tag chip goes into the tags field. */
  accept(chip: AiChip): void {
    this.addTags([chip.name]);
    this.appliedTags.update((names) => [...names, chip.name]);
  }

  dismiss(chip: AiChip): void {
    this.dismissed.update((ids) => new Set([...ids, chip.id]));
  }

  private finish(job: AiJobResponse): void {
    if (job.status === AI_JOB_STATUS.Done) {
      this.apply(job);
      this.state.set(AI_FILL_STATE.Ready);
    } else if (job.reason === AI_JOB_REASON.Quota) {
      this.state.set(AI_FILL_STATE.Quota);
    } else if (job.reason === AI_JOB_REASON.Unavailable) {
      this.state.set(AI_FILL_STATE.Unavailable);
    } else {
      this.state.set(AI_FILL_STATE.Hidden);
    }
  }

  /** Puts the folder into an empty Folder field and the existing tags next to the user's. */
  private apply(job: AiJobResponse): void {
    const target = this.target;
    if (target === null) return;
    const folder = job.suggestions.find((item) => item.kind === SUGGESTION_KIND.Folder);
    const folderId = folder?.folderId ?? null;
    if (
      folderId !== null &&
      target.folderId() === null &&
      target.newFolderName() === null &&
      target.folders().some((candidate) => candidate.id === folderId)
    ) {
      target.folderId.set(folderId);
      this.appliedFolder.set(folderId);
    }
    // Every suggested tag, new ones too: a new tag becomes a real tag on save, like a typed one.
    const tags = job.suggestions.flatMap((item) =>
      item.kind !== SUGGESTION_KIND.Folder && item.tagName !== null ? [item.tagName] : [],
    );
    this.cleanTitleValue.set(job.title);
    this.appliedTags.set(this.addTags(tags));
    this.newTags.set(
      job.suggestions.flatMap((item) =>
        item.kind === SUGGESTION_KIND.NewTag && item.tagName !== null
          ? [{ id: item.id, name: item.tagName }]
          : [],
      ),
    );
    this.filled.set(true);
  }

  /** Adds the names the field does not hold yet; answers the ones that went in. */
  private addTags(names: readonly string[]): string[] {
    const target = this.target;
    if (target === null) return [];
    const tags = target.chosenTags();
    const present = new Set(tags.map((tag) => tag.toLowerCase()));
    const added = names.map(normalizeTagName).filter((name) => {
      const fresh = name !== '' && !present.has(name.toLowerCase());
      present.add(name.toLowerCase());
      return fresh;
    });
    target.chosenTags.set([...tags, ...added].slice(0, LINK_LIMIT.TagsMax));
    return added;
  }

  private request(draftId: string, page: PageInfo): CreateAiDraftRequest {
    // A generic tab title ("YouTube") is not sent: the server reads the video's own (oEmbed).
    const title = page.titleFromTab ? page.title.trim().slice(0, LINK_LIMIT.TitleMax) : '';
    const note = this.settings()?.settings.includeNotes
      ? this.target?.note().trim().slice(0, LINK_LIMIT.NoteMax)
      : undefined;
    return {
      draftId,
      url: withoutFragment(page.url),
      ...(title !== '' && { title }),
      ...(note !== undefined && note !== '' && { note }),
    };
  }
}
