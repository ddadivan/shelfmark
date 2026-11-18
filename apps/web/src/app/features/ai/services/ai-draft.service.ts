import { computed, DestroyRef, inject, Injector, Service, signal } from '@angular/core';
import {
  AI_JOB_REASON,
  AI_JOB_STATUS,
  AI_LIMIT,
  LINK_LIMIT,
  type AiJobResponse,
  type CreateAiDraftRequest,
  type LinkSuggestion,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { AI_API } from '../models/ai-api.const';
import type { AiDraftInput } from '../models/ai-draft-input.interface';
import { AI_DRAFT_STATE } from '../models/ai-draft-state.const';
import type { AiDraftState } from '../models/ai-draft-state.type';
import { AI_POLL_INTERVAL_MS } from '../models/ai-poll-interval.const';
import { AiSettingsStore } from './ai-settings.store';

/**
 * The draft suggestions of one Add link dialog (provided by the dialog, #390): one `draftId` per
 * dialog, `POST /api/ai/drafts` once the preview of an address has loaded, then `GET
 * /api/ai/jobs/:id` until the job is done or `AI_LIMIT.DraftPollMaxMs` has passed (then the rows
 * collapse: the save never waits). A new address starts a new draft; "Try again" after a provider
 * error asks once more with the same id, so the server runs that draft again instead of leaving
 * it behind. Dismissing a draft chip only hides it here: the server
 * cannot dismiss suggestions of a link that is not saved yet. Does nothing while AI is off.
 */
@Service({ autoProvided: false })
export class AiDraftService {
  private readonly injector = inject(Injector);
  private readonly settings = inject(AiSettingsStore);

  private readonly job = signal<AiJobResponse | null>(null);
  private readonly hidden = signal<ReadonlySet<string>>(new Set());
  private readonly retried = signal(false);
  private readonly id = signal<string | null>(null);
  private input: AiDraftInput | null = null;
  private epoch = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private wake: (() => void) | null = null;

  readonly state = signal<AiDraftState>(AI_DRAFT_STATE.Idle);

  /** The draft's suggestions once ready, without the ones dismissed in this dialog. */
  readonly suggestions = computed<readonly LinkSuggestion[]>(() => {
    const job = this.job();
    if (this.state() !== AI_DRAFT_STATE.Ready || job === null) {
      return [];
    }
    const hidden = this.hidden();
    return job.suggestions.filter((item) => !hidden.has(item.id));
  });

  /** The draft's AI summary once ready (Add link, "Fill in with AI"), else `null`. */
  readonly summary = computed(() =>
    this.state() === AI_DRAFT_STATE.Ready ? (this.job()?.summary ?? null) : null,
  );

  /** The draft's cleaned-up title once ready, else `null`. */
  readonly title = computed(() =>
    this.state() === AI_DRAFT_STATE.Ready ? (this.job()?.title ?? null) : null,
  );

  /** The draft has an answer (or none will come): ready, limit, error or too slow. */
  readonly settled = computed(() => {
    const state = this.state();
    return state !== AI_DRAFT_STATE.Idle && state !== AI_DRAFT_STATE.Loading;
  });

  /** "Try again" is offered once, after a provider error or a failed request. */
  readonly canRetry = computed(
    () => this.state() === AI_DRAFT_STATE.Unavailable && !this.retried(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /**
   * Asks for suggestions for a loaded preview. The same address again changes nothing; another
   * address drops the old draft and starts a new one.
   */
  start(input: AiDraftInput): void {
    if (!this.settings.isOn() || (this.input?.url === input.url && this.id() !== null)) {
      return;
    }
    this.reset();
    this.input = input;
    this.retried.set(false);
    void this.run();
  }

  /** The address is gone or no longer valid: the rows collapse and the draft is forgotten. */
  reset(): void {
    this.stop();
    this.input = null;
    this.id.set(null);
    this.job.set(null);
    this.hidden.set(new Set());
    this.state.set(AI_DRAFT_STATE.Idle);
  }

  /** "Try again" (once): the same draft again, which the server re-arms after an outage. */
  retry(): void {
    if (!this.canRetry() || this.input === null) {
      return;
    }
    this.retried.set(true);
    void this.run(this.id());
  }

  /** Hides a chip for the rest of this dialog. */
  dismiss(id: string): void {
    this.hidden.update((ids) => new Set([...ids, id]));
  }

  /** The id the save sends as `aiDraftId`, so the server picks up the result; `null` without a draft. */
  draftId(): string | null {
    return this.state() === AI_DRAFT_STATE.Idle ? null : this.id();
  }

  private async run(reuse: string | null = null): Promise<void> {
    const input = this.input;
    if (input === null) {
      return;
    }
    this.stop();
    const run = this.epoch;
    const draftId = reuse ?? globalThis.crypto.randomUUID();
    this.id.set(draftId);
    this.job.set(null);
    this.state.set(AI_DRAFT_STATE.Loading);
    const started = Date.now();
    try {
      const api = this.injector.get(AI_API);
      let job = await firstValueFrom(api.createDraft(this.request(draftId, input)));
      while (job.status === AI_JOB_STATUS.Pending && run === this.epoch) {
        if (Date.now() - started + AI_POLL_INTERVAL_MS > AI_LIMIT.DraftPollMaxMs) {
          // Too slow: saved without them; they wait in Edit link.
          this.state.set(AI_DRAFT_STATE.Hidden);
          return;
        }
        await this.pause();
        if (run !== this.epoch) {
          return;
        }
        job = await firstValueFrom(api.getJob(job.id));
      }
      if (run === this.epoch) {
        this.finish(job);
      }
    } catch {
      if (run === this.epoch) {
        this.state.set(AI_DRAFT_STATE.Unavailable);
      }
    }
  }

  private finish(job: AiJobResponse): void {
    this.job.set(job);
    if (job.status === AI_JOB_STATUS.Done) {
      this.state.set(AI_DRAFT_STATE.Ready);
    } else if (job.reason === AI_JOB_REASON.Quota) {
      this.state.set(AI_DRAFT_STATE.Quota);
    } else if (job.reason === AI_JOB_REASON.Unavailable) {
      this.state.set(AI_DRAFT_STATE.Unavailable);
    } else {
      this.state.set(AI_DRAFT_STATE.Hidden);
    }
  }

  private request(draftId: string, input: AiDraftInput): CreateAiDraftRequest {
    const title = input.title?.trim().slice(0, LINK_LIMIT.TitleMax);
    const description = input.description?.trim();
    const note = this.settings.settings().includeNotes
      ? input.note?.trim().slice(0, LINK_LIMIT.NoteMax)
      : undefined;
    return {
      draftId,
      url: input.url,
      ...(title && { title }),
      ...(description && { description }),
      ...(note && { note }),
    };
  }

  private pause(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.wake = resolve;
      this.timer = setTimeout(resolve, AI_POLL_INTERVAL_MS);
    });
  }

  /** Ends a running draft: its answers are ignored from now on. */
  private stop(): void {
    this.epoch++;
    clearTimeout(this.timer);
    this.wake?.();
    this.wake = null;
  }
}
