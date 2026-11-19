import { inject, Service } from '@angular/core';
import {
  ACCOUNT_PLAN,
  AI_APPLIED_PART,
  AI_BACKFILL_STATE,
  AI_FEATURE_MODE,
  AI_JOB_REASON,
  AI_JOB_STATUS,
  AI_LIMIT,
  AI_PROVIDER_STATUS,
  AI_QUOTA,
  AI_SEARCH_STATE,
  AI_TIER,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  SUMMARY_SOURCE,
  type AiAppliedPart,
  type AiAutoApplied,
  type AiBackfillStatus,
  type AiJobResponse,
  type AiSearchStatus,
  type AskAllowance,
  type AskStatus,
  type AiSettings,
  type AiSettingsResponse,
  type LinkAiState,
  type LinkResponse,
  type LinkSuggestion,
  type UpdateAiSettingsRequest,
} from '@shelfmark/contracts';
import { isDemoMockSession } from '../../links/mock/demo-library-seed';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { normalizeLinkTags } from '../../links/mock/normalize-link-tags';
import { nextUtcMonthStart, readMockAiAccount, writeMockAiAccount } from './mock-ai-account';
import { mockAiOutcome } from './mock-ai-outcome';
import { mockAskAllowance } from './mock-ask-allowance';
import { MOCK_AI_ANNOUNCEMENT_STORAGE_KEY } from './models/mock-ai-announcement-storage-key.const';
import type { MockAiAccount } from './models/mock-ai-account.interface';
import type { MockAiLibrary } from './models/mock-ai-library.interface';
import type { MockBackfillRefusal } from './models/mock-backfill-refusal.type';
import type { MockAiBackfillRun } from './models/mock-ai-backfill-run.interface';
import type { MockAiJob } from './models/mock-ai-job.interface';
import { MOCK_AI_TIMING } from './models/mock-ai-timing.const';
import { MOCK_AI_URL_MARKER } from './models/mock-ai-url-marker.const';

/** Like the API: the provider reads as unavailable this long after a job failed with `unavailable`. */
const PROVIDER_WINDOW_MS = 15 * 60_000;
const MS_PER_MINUTE = 60_000;
/** Share of links the `searchProcessing` toggle reports as embedded (under the API's 80%). */
const PROCESSING_SHARE = 0.6;
const IDLE_BACKFILL: MockAiBackfillRun = {
  state: AI_BACKFILL_STATE.Idle,
  linkIds: [],
  done: 0,
  startedAt: 0,
};

function mockStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function sameTag(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && a.toLowerCase() === b.toLowerCase();
}

/**
 * The state behind the mock AI API and the AI side of the mock links API (mock builds only). The
 * account (settings, intro, usage) lives in `localStorage`; jobs, suggestions and "Moved by AI"
 * marks in memory, next to the mock library. Jobs finish `MOCK_AI_TIMING.JobMs` after they were
 * queued, checked on every read (`settle`), so nothing runs on a timer. Like the API: suggestions
 * are only the user's own tags and folders plus at most one new tag, Automatic mode fills only an
 * empty folder or tag list, a summary the user wrote is never replaced, backfill never auto-applies.
 */
@Service()
export class MockAiData {
  private readonly library = inject(MockLibraryData);
  private readonly demo = isDemoMockSession();
  private readonly jobs = new Map<string, MockAiJob>();
  private readonly suggestions = new Map<string, LinkSuggestion[]>(this.library.demoSuggestions);
  private readonly applied = new Map<string, AiAutoApplied>();
  private backfill: MockAiBackfillRun = IDLE_BACKFILL;
  private failedAt: number | null = null;

  get account(): MockAiAccount {
    return readMockAiAccount(mockStorage(), this.demo, Date.now());
  }

  set account(account: MockAiAccount) {
    writeMockAiAccount(mockStorage(), account);
  }

  /** The one-time AI announcement was seen (the demo never gets it: AI is on there). */
  get announcementSeen(): boolean {
    return this.demo || mockStorage()?.getItem(MOCK_AI_ANNOUNCEMENT_STORAGE_KEY) === '1';
  }

  get settings(): AiSettings {
    return this.account.settings;
  }

  settingsResponse(): AiSettingsResponse {
    this.settle();
    const account = this.account;
    const now = Date.now();
    const limits = AI_QUOTA[account.tier];
    return {
      settings: account.settings,
      introSeen: account.introSeen,
      announcementSeen: this.announcementSeen,
      entitlements: {
        plan: account.tier === AI_TIER.AiPack ? ACCOUNT_PLAN.Pro : ACCOUNT_PLAN.Free,
        aiTier: account.tier,
      },
      usage: {
        linksUsed: account.linksUsed,
        linksLimit: limits.linksPerMonth,
        resetsOn: nextUtcMonthStart(now),
        backfillUsed: account.backfillUsed,
        backfillLimit: limits.backfillLinks,
      },
      providerStatus:
        this.failedAt !== null && now - this.failedAt < PROVIDER_WINDOW_MS
          ? AI_PROVIDER_STATUS.Unavailable
          : AI_PROVIDER_STATUS.Ok,
      pendingJobs: this.pendingJobs(),
      backfill: this.backfillStatus(),
      search: this.searchStatus(),
      ask: this.askStatus(),
    };
  }

  /** Ask your shelf like the API: available while AI and the Ask switch are on. */
  askStatus(): AskStatus {
    const { settings } = this.account;
    return { available: settings.enabled && settings.ask, allowance: this.askAllowance() };
  }

  /** The question allowance of the mock account's tier (`AI_QUOTA`). */
  askAllowance(): AskAllowance {
    const account = this.account;
    return mockAskAllowance(
      AI_QUOTA[account.tier],
      account.askDayUsed,
      account.askMonthUsed,
      Date.now(),
    );
  }

  /** Counts a question (`1`) or refunds one (`-1`) for today and this month. */
  countQuestion(delta: 1 | -1): void {
    const account = this.account;
    this.account = {
      ...account,
      askDayUsed: Math.max(0, account.askDayUsed + delta),
      askMonthUsed: Math.max(0, account.askMonthUsed + delta),
    };
  }

  /**
   * Search by meaning readiness, like the API: `off` while AI or the switch is off; the mock embeds
   * every live link at once, except while the account's `searchProcessing` toggle reads "getting
   * ready" (60% of the links).
   */
  searchStatus(): AiSearchStatus {
    const account = this.account;
    const total = this.library.links.length;
    if (!account.settings.enabled || !account.settings.meaningSearch) {
      return { state: AI_SEARCH_STATE.Off, ready: 0, total };
    }
    if (account.searchProcessing) {
      return {
        state: AI_SEARCH_STATE.Processing,
        ready: Math.floor(total * PROCESSING_SHARE),
        total,
      };
    }
    return { state: AI_SEARCH_STATE.Ready, ready: total, total };
  }

  /** `PATCH /api/ai/settings`: the first `enabled: true` marks the intro seen, off skips pending work. */
  updateSettings(request: UpdateAiSettingsRequest): AiSettingsResponse {
    const { announcementSeen, ...change } = request;
    if (announcementSeen === true) {
      try {
        mockStorage()?.setItem(MOCK_AI_ANNOUNCEMENT_STORAGE_KEY, '1');
      } catch {
        // Storage unavailable: the flag lasts until the next read.
      }
    }
    const account = this.account;
    const settings = { ...account.settings, ...change };
    this.account = { ...account, settings, introSeen: account.introSeen || settings.enabled };
    if (!settings.enabled) {
      for (const job of this.jobs.values()) {
        if (job.status === AI_JOB_STATUS.Pending) {
          this.skip(job, AI_JOB_REASON.Off);
        }
      }
      this.stopBackfill();
    }
    return this.settingsResponse();
  }

  pendingJobs(): number {
    return [...this.jobs.values()].filter((job) => job.status === AI_JOB_STATUS.Pending).length;
  }

  /** `POST /api/ai/drafts`: the job of `draftId` (the same one on a repeat), or a new one. */
  draft(draftId: string, url: string, title: string): AiJobResponse {
    this.settle();
    const known = [...this.jobs.values()].find((job) => job.draftId === draftId);
    if (known) {
      // "Try again" after an outage: the server runs the same draft once more.
      if (
        known.linkId === null &&
        known.status === AI_JOB_STATUS.Failed &&
        known.reason === AI_JOB_REASON.Unavailable
      ) {
        Object.assign(known, { status: AI_JOB_STATUS.Pending, reason: null, queuedAt: Date.now() });
      }
      return this.view(known);
    }
    return this.view(this.queue(url, title, draftId, null, !this.settings.enabled));
  }

  /** `GET /api/ai/jobs/:id`, or `null` (404). */
  job(id: string): AiJobResponse | null {
    this.settle();
    const job = this.jobs.get(id);
    return job ? this.view(job) : null;
  }

  /**
   * The AI side of `POST /api/links`: picks up the draft of `draftId`, or queues a job when AI is
   * on and a part is wanted. Answers the link as it is saved (pending, or with the draft applied).
   */
  linkCreated(
    link: LinkResponse,
    draftId: string | undefined,
    summaryDeclined = false,
  ): LinkResponse {
    const settings = this.settings;
    if (!settings.enabled) {
      return link;
    }
    this.settle();
    const draft =
      draftId === undefined
        ? undefined
        : [...this.jobs.values()].find((job) => job.draftId === draftId && job.linkId === null);
    if (draft) {
      draft.linkId = link.id;
      if (summaryDeclined) {
        // Like the API: the save asked for no summary, so the draft's never lands (#507).
        draft.summary = null;
        draft.noSummary = true;
      }
      return draft.status === AI_JOB_STATUS.Done
        ? this.apply(link, draft, true)
        : { ...link, aiStatus: draft.status };
    }
    const wanted =
      (settings.summaries && !summaryDeclined) ||
      (settings.folderMode !== AI_FEATURE_MODE.Off && link.folderId === null) ||
      (settings.tagsMode !== AI_FEATURE_MODE.Off && link.tags.length === 0);
    if (!wanted) {
      return link;
    }
    const job = this.queue(link.url, link.title, null, link.id);
    job.noSummary = summaryDeclined;
    return { ...link, aiStatus: job.status };
  }

  /** The AI side of `PATCH /api/links/:id`: the user's folder or tags end the "Moved by AI" marks. */
  linkEdited(id: string, folderChanged: boolean, tagsChanged: boolean): void {
    if (folderChanged) {
      this.clearApplied(id, AI_APPLIED_PART.Folder);
    }
    if (tagsChanged) {
      this.clearApplied(id, AI_APPLIED_PART.Tags);
    }
  }

  /**
   * The AI side of a new address on `PATCH /api/links/:id`: like the API, a job is queued again
   * when AI is on and the summary is not the user's. Answers the link as it is saved then.
   */
  linkUrlChanged(link: LinkResponse): LinkResponse {
    if (!this.settings.enabled || link.summarySource === SUMMARY_SOURCE.User) {
      return link;
    }
    const job = this.queue(link.url, link.title, null, link.id);
    const next = { ...link, aiStatus: job.status };
    this.replace(next);
    return next;
  }

  /** `GET /api/links/:id/ai`, or `null` (404). */
  linkState(id: string): LinkAiState | null {
    this.settle();
    const link = this.library.links.find((item) => item.id === id);
    if (!link) {
      return null;
    }
    const latest = [...this.jobs.values()].filter((job) => job.linkId === id).at(-1);
    return {
      aiStatus: link.aiStatus,
      reason: latest?.reason ?? null,
      summary: link.summary,
      summarySource: link.summarySource,
      suggestions: [...(this.suggestions.get(id) ?? [])],
      autoApplied: this.applied.get(id) ?? null,
    };
  }

  /** `POST /api/ai/suggestions/:id/dismiss`; false when there is no such suggestion (404). */
  dismiss(id: string): boolean {
    let found = false;
    for (const [linkId, list] of this.suggestions) {
      const kept = list.filter((item) => item.id !== id);
      found ||= kept.length !== list.length;
      this.suggestions.set(linkId, kept);
    }
    for (const job of this.jobs.values()) {
      const kept = job.suggestions.filter((item) => item.id !== id);
      found ||= kept.length !== job.suggestions.length;
      job.suggestions = kept;
    }
    return found;
  }

  /** The stored suggestions of a link, as the mock Tidy reads them (call `settle` first). */
  suggestionsOf(linkId: string): readonly LinkSuggestion[] {
    return this.suggestions.get(linkId) ?? [];
  }

  /** Replaces the stored suggestions of a link (the mock Tidy's apply and undo). */
  setSuggestions(linkId: string, list: readonly LinkSuggestion[]): void {
    this.suggestions.set(linkId, [...list]);
  }

  /** The folder Automatic mode put the link in while its mark is open, else `null`. */
  autoAppliedFolder(linkId: string): string | null {
    return this.applied.get(linkId)?.folderId ?? null;
  }

  /**
   * `POST /api/links/:id/ai/rewrite`: a new AI summary at once (counts against the month). `null`
   * for a missing link; `conflict` while the summary is the user's or AI is off; `quota` at the limit.
   */
  rewrite(id: string): LinkAiState | 'conflict' | 'quota' | null {
    this.settle();
    const link = this.library.links.find((item) => item.id === id);
    if (!link) {
      return null;
    }
    if (link.summarySource === SUMMARY_SOURCE.User || !this.settings.enabled) {
      return 'conflict';
    }
    if (!this.reserve()) {
      return 'quota';
    }
    const outcome = mockAiOutcome(link.url, link.title, this.libraryView());
    this.replace({
      ...link,
      summary: `In short: ${outcome.summary}`.slice(0, AI_LIMIT.SummaryMax),
      summarySource: SUMMARY_SOURCE.Ai,
      aiStatus: AI_JOB_STATUS.Done,
    });
    return this.linkState(id);
  }

  /** `POST /api/links/:id/ai/undo`: puts back what Automatic mode changed; `null` for a missing link. */
  undo(id: string, part: AiAppliedPart): LinkResponse | null {
    this.settle();
    const link = this.library.links.find((item) => item.id === id);
    if (!link) {
      return null;
    }
    const applied = this.applied.get(id);
    let next = link;
    if (
      part === AI_APPLIED_PART.Folder &&
      applied?.folderId &&
      link.folderId === applied.folderId
    ) {
      next = { ...next, folderId: null, pinnedInFolderAt: null };
    }
    if (part === AI_APPLIED_PART.Tags && applied && applied.tags.length > 0) {
      next = {
        ...next,
        tags: next.tags.filter((tag) => !applied.tags.some((t) => sameTag(t, tag))),
      };
    }
    this.clearApplied(id, part);
    this.replace(next);
    return this.library.linkView(next);
  }

  /**
   * `DELETE /api/ai/data`: AI summaries, suggestions, marks, jobs and vectors go (search by meaning
   * turns off, plan open question 3); the user's summaries stay.
   */
  deleteData(): void {
    const account = this.account;
    this.account = { ...account, settings: { ...account.settings, meaningSearch: false } };
    this.library.links = this.library.links.map((link) =>
      link.summarySource === SUMMARY_SOURCE.Ai
        ? { ...link, summary: null, summarySource: null, aiStatus: null }
        : { ...link, aiStatus: null },
    );
    this.suggestions.clear();
    this.applied.clear();
    this.jobs.clear();
    this.backfill = IDLE_BACKFILL;
  }

  backfillStatus(): AiBackfillStatus {
    this.advanceBackfill(Date.now());
    const run = this.backfill;
    const eligible = this.eligible().length;
    const running = run.state === AI_BACKFILL_STATE.Running;
    const account = this.account;
    const allowance = Math.max(0, AI_QUOTA[account.tier].backfillLinks - account.backfillUsed);
    const left = running ? run.linkIds.length - run.done : Math.min(eligible, allowance);
    return {
      state: run.state,
      eligible,
      total: run.linkIds.length,
      done: run.done,
      estimatedMinutes:
        left === 0 ? null : Math.ceil((left * MOCK_AI_TIMING.BackfillLinkMs) / MS_PER_MINUTE),
    };
  }

  /** `POST /api/ai/backfill`: the links without an AI result, up to the one-time allowance. */
  startBackfill(): AiBackfillStatus | MockBackfillRefusal {
    const account = this.account;
    const allowance = AI_QUOTA[account.tier].backfillLinks - account.backfillUsed;
    if (allowance <= 0) {
      return 'unavailable';
    }
    if (!account.settings.enabled) {
      return 'off';
    }
    if (this.backfillStatus().state === AI_BACKFILL_STATE.Running) {
      return 'running';
    }
    const linkIds = this.eligible()
      .slice(0, allowance)
      .map((link) => link.id);
    this.backfill = {
      state: linkIds.length === 0 ? AI_BACKFILL_STATE.Done : AI_BACKFILL_STATE.Running,
      linkIds,
      done: 0,
      startedAt: Date.now(),
    };
    return this.backfillStatus();
  }

  /** `DELETE /api/ai/backfill`: what was done stays. */
  stopBackfill(): AiBackfillStatus {
    this.advanceBackfill(Date.now());
    if (this.backfill.state === AI_BACKFILL_STATE.Running) {
      this.backfill = { ...this.backfill, state: AI_BACKFILL_STATE.Stopped };
    }
    return this.backfillStatus();
  }

  /** Finishes every job whose time has come and moves a running backfill on. */
  settle(now: number = Date.now()): void {
    for (const job of this.jobs.values()) {
      if (job.status === AI_JOB_STATUS.Pending && now - job.queuedAt >= MOCK_AI_TIMING.JobMs) {
        this.finish(job, now, true);
      }
    }
    this.advanceBackfill(now);
  }

  private queue(
    url: string,
    title: string,
    draftId: string | null,
    linkId: string | null,
    off = false,
  ): MockAiJob {
    const job = this.newJob(url, title, draftId, linkId);
    if (off) {
      this.skip(job, AI_JOB_REASON.Off);
    } else if (url.includes(MOCK_AI_URL_MARKER.Quota) || !this.reserve()) {
      this.skip(job, AI_JOB_REASON.Quota);
    }
    return job;
  }

  private newJob(
    url: string,
    title: string,
    draftId: string | null,
    linkId: string | null,
  ): MockAiJob {
    const job: MockAiJob = {
      id: globalThis.crypto.randomUUID(),
      draftId,
      linkId,
      url,
      title,
      queuedAt: Date.now(),
      status: AI_JOB_STATUS.Pending,
      reason: null,
      suggestions: [],
      summary: null,
      cleanTitle: null,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  /** Counts one link against the month; false at the limit. */
  private reserve(): boolean {
    const account = this.account;
    if (account.linksUsed >= AI_QUOTA[account.tier].linksPerMonth) {
      return false;
    }
    this.account = { ...account, linksUsed: account.linksUsed + 1 };
    return true;
  }

  private skip(job: MockAiJob, reason: MockAiJob['reason']): void {
    job.status = AI_JOB_STATUS.Skipped;
    job.reason = reason;
    this.patchLink(job.linkId, { aiStatus: AI_JOB_STATUS.Skipped });
  }

  private finish(job: MockAiJob, now: number, auto: boolean): void {
    if (job.url.includes(MOCK_AI_URL_MARKER.Fail) || job.url.includes(MOCK_AI_URL_MARKER.Refuse)) {
      const unavailable = job.url.includes(MOCK_AI_URL_MARKER.Fail);
      job.status = AI_JOB_STATUS.Failed;
      job.reason = unavailable ? AI_JOB_REASON.Unavailable : AI_JOB_REASON.Rejected;
      this.failedAt = unavailable ? now : this.failedAt;
      this.patchLink(job.linkId, { aiStatus: AI_JOB_STATUS.Failed });
      return;
    }
    const settings = this.settings;
    const outcome = mockAiOutcome(job.url, job.title, this.libraryView());
    const suggestions: LinkSuggestion[] = [];
    const suggestion = (
      kind: LinkSuggestion['kind'],
      tagName: string | null,
      folderId: string | null,
    ) =>
      suggestions.push({
        id: globalThis.crypto.randomUUID(),
        kind,
        state: SUGGESTION_STATE.Suggested,
        tagName,
        folderId,
      });
    if (settings.folderMode !== AI_FEATURE_MODE.Off && outcome.folderId !== null) {
      suggestion(SUGGESTION_KIND.Folder, null, outcome.folderId);
    }
    if (settings.tagsMode !== AI_FEATURE_MODE.Off) {
      outcome.tags.forEach((name) => suggestion(SUGGESTION_KIND.Tag, name, null));
      if (outcome.newTag !== null) {
        suggestion(SUGGESTION_KIND.NewTag, outcome.newTag, null);
      }
    }
    job.status = AI_JOB_STATUS.Done;
    job.reason =
      suggestions.length === 0 && !settings.summaries ? AI_JOB_REASON.NothingFound : null;
    job.suggestions = suggestions;
    job.summary = settings.summaries && job.noSummary !== true ? outcome.summary : null;
    job.cleanTitle = job.linkId === null ? outcome.title : null;
    const link = this.library.links.find((item) => item.id === job.linkId);
    if (link) {
      this.apply(link, job, auto);
    }
  }

  /**
   * Writes a finished job onto its link: the summary unless the user wrote one, the suggestions
   * for what is still open, and in Automatic mode the top folder (link in Unsorted) and the
   * existing tags (link without tags), marked "Moved by AI".
   */
  private apply(link: LinkResponse, job: MockAiJob, auto: boolean): LinkResponse {
    const settings = this.settings;
    let folderId = link.folderId;
    let tags = [...link.tags];
    const applied: AiAutoApplied = { folderId: null, tags: [] };
    const kept: LinkSuggestion[] = [];
    for (const item of job.suggestions) {
      if (item.kind === SUGGESTION_KIND.Folder) {
        const live = this.library.folderList.some((folder) => folder.id === item.folderId);
        if (folderId !== null || !live) {
          continue;
        }
        if (auto && settings.folderMode === AI_FEATURE_MODE.Auto) {
          folderId = item.folderId;
          applied.folderId = item.folderId;
          kept.push({ ...item, state: SUGGESTION_STATE.AutoApplied });
          continue;
        }
      } else {
        if (tags.some((tag) => sameTag(tag, item.tagName))) {
          continue;
        }
        const autoTag =
          auto &&
          item.kind === SUGGESTION_KIND.Tag &&
          item.tagName !== null &&
          settings.tagsMode === AI_FEATURE_MODE.Auto &&
          link.tags.length === 0;
        if (autoTag && item.tagName !== null) {
          tags = [...tags, item.tagName];
          applied.tags.push(item.tagName);
          kept.push({ ...item, state: SUGGESTION_STATE.AutoApplied });
          continue;
        }
      }
      kept.push(item);
    }
    const userSummary = link.summarySource === SUMMARY_SOURCE.User;
    const next: LinkResponse = {
      ...link,
      folderId,
      tags: normalizeLinkTags(tags),
      summary: userSummary || job.summary === null ? link.summary : job.summary,
      summarySource: userSummary || job.summary === null ? link.summarySource : SUMMARY_SOURCE.Ai,
      aiStatus: job.status,
    };
    this.suggestions.set(link.id, kept);
    if (applied.folderId !== null || applied.tags.length > 0) {
      this.applied.set(link.id, applied);
    }
    this.library.ensureTags(next.tags);
    this.replace(next);
    return next;
  }

  private clearApplied(id: string, part: AiAppliedPart): void {
    const applied = this.applied.get(id);
    if (!applied) {
      return;
    }
    const folder = part === AI_APPLIED_PART.Folder;
    const next: AiAutoApplied = folder ? { ...applied, folderId: null } : { ...applied, tags: [] };
    const kind = (item: LinkSuggestion) =>
      folder ? item.kind === SUGGESTION_KIND.Folder : item.kind !== SUGGESTION_KIND.Folder;
    this.suggestions.set(
      id,
      (this.suggestions.get(id) ?? []).filter(
        (item) => !(item.state === SUGGESTION_STATE.AutoApplied && kind(item)),
      ),
    );
    if (next.folderId === null && next.tags.length === 0) {
      this.applied.delete(id);
    } else {
      this.applied.set(id, next);
    }
  }

  private advanceBackfill(now: number): void {
    const run = this.backfill;
    if (run.state !== AI_BACKFILL_STATE.Running) {
      return;
    }
    const target = Math.min(
      run.linkIds.length,
      Math.floor((now - run.startedAt) / MOCK_AI_TIMING.BackfillLinkMs),
    );
    for (const id of run.linkIds.slice(run.done, target)) {
      const link = this.library.links.find((item) => item.id === id);
      if (link) {
        const job = this.queueBackfill(link);
        this.finish(job, now, false);
      }
    }
    const done = Math.max(run.done, target);
    this.backfill = {
      ...run,
      done,
      state: done >= run.linkIds.length ? AI_BACKFILL_STATE.Done : run.state,
    };
  }

  /** A backfill job: uses the one-time allowance, not the month. */
  private queueBackfill(link: LinkResponse): MockAiJob {
    const account = this.account;
    this.account = { ...account, backfillUsed: account.backfillUsed + 1 };
    return this.newJob(link.url, link.title, null, link.id);
  }

  private eligible(): LinkResponse[] {
    return this.library.links.filter((link) => link.aiStatus === null);
  }

  private libraryView(): MockAiLibrary {
    return {
      folders: this.library.folderList,
      tags: this.library.tagList.map((tag) => tag.name),
      links: this.library.links,
    };
  }

  private patchLink(id: string | null, patch: Partial<LinkResponse>): void {
    const link = this.library.links.find((item) => item.id === id);
    if (link) {
      this.replace({ ...link, ...patch });
    }
  }

  private replace(next: LinkResponse): void {
    this.library.links = this.library.links.map((link) => (link.id === next.id ? next : link));
  }

  private view(job: MockAiJob): AiJobResponse {
    return {
      id: job.id,
      status: job.status,
      reason: job.reason,
      suggestions: job.status === AI_JOB_STATUS.Done ? [...job.suggestions] : [],
      summary: job.summary,
      title: job.status === AI_JOB_STATUS.Done ? job.cleanTitle : null,
    };
  }
}
