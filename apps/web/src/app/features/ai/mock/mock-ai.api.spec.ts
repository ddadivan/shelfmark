import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import {
  AI_APPLIED_PART,
  AI_BACKFILL_STATE,
  AI_FEATURE_MODE,
  AI_JOB_REASON,
  AI_JOB_STATUS,
  AI_PROVIDER_STATUS,
  AI_QUOTA,
  AI_SEARCH_LIMIT,
  AI_SEARCH_STATE,
  MEANING_REASON_SOURCE,
  AI_TIER,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  SUMMARY_SOURCE,
} from '@shelfmark/contracts';
import { firstValueFrom, type Observable } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockLinksApi } from '../../links/mock/mock-links.api';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import { MockCleanupData } from '../../cleanup/mock/mock-cleanup-data';
import { MockAiApi } from './mock-ai.api';
import { MockAiData } from './mock-ai-data';
import { MockAiTidy } from './mock-ai-tidy';
import { MockAiMeaning } from './mock-ai-meaning';
import { MockAiAsk } from './mock-ai-ask';
import { MOCK_AI_TIMING } from './models/mock-ai-timing.const';

/** Resolves `source` while the fake clock runs past the mock latency. */
async function run<T>(source: Observable<T>): Promise<T> {
  const result = firstValueFrom(source);
  await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS.Preview);
  return result;
}

/** The HTTP status `source` fails with. */
async function statusOf(source: Observable<unknown>): Promise<number> {
  const result = firstValueFrom(source).then(
    () => 0,
    (error: unknown) => (error instanceof HttpErrorResponse ? error.status : -1),
  );
  await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS.Preview);
  return result;
}

function setup() {
  const injector = Injector.create({
    providers: [MockLibraryData, MockAiData, MockAiTidy, MockAiMeaning, MockAiAsk, MockCleanupData],
  });
  return runInInjectionContext(injector, () => ({
    ai: new MockAiApi(),
    links: new MockLinksApi(),
    data: injector.get(MockLibraryData),
    store: injector.get(MockAiData),
  }));
}

/** A title that names the first folder and the first tag of the mock library. */
function namedTitle(data: MockLibraryData): string {
  return `${data.folderList[0].name} and ${data.tagList[0].name}`;
}

describe('MockAiApi', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('starts off with the intro not seen; the first switch on marks it seen', async () => {
    const { ai } = setup();
    const initial = await run(ai.getSettings());
    expect(initial.settings.enabled).toBe(false);
    expect(initial.introSeen).toBe(false);
    expect(initial.entitlements.aiTier).toBe(AI_TIER.AiPack);
    expect(initial.usage.linksLimit).toBe(AI_QUOTA[AI_TIER.AiPack].linksPerMonth);
    const on = await run(ai.updateSettings({ enabled: true, tagsMode: AI_FEATURE_MODE.Auto }));
    expect(on.settings.enabled).toBe(true);
    expect(on.settings.tagsMode).toBe(AI_FEATURE_MODE.Auto);
    expect(on.introSeen).toBe(true);
    expect((await run(ai.getSettings())).introSeen).toBe(true);
    expect(await statusOf(ai.updateSettings({}))).toBe(400);
  });

  it('has the AI announcement unseen until a PATCH marks it, without touching the settings (#507)', async () => {
    const { ai } = setup();
    const before = await run(ai.getSettings());
    expect(before.announcementSeen).toBe(false);
    const after = await run(ai.updateSettings({ announcementSeen: true }));
    expect(after.announcementSeen).toBe(true);
    expect(after.settings).toEqual(before.settings);
    expect((await run(ai.getSettings())).announcementSeen).toBe(true);
  });

  it('answers a draft later with own suggestions and a summary; a repeat is the same job', async () => {
    const { ai, data } = setup();
    await run(ai.updateSettings({ enabled: true }));
    const request = { draftId: 'd-1', url: 'https://draft.example/page', title: namedTitle(data) };
    const started = await run(ai.createDraft(request));
    expect(started.status).toBe(AI_JOB_STATUS.Pending);
    expect((await run(ai.getSettings())).pendingJobs).toBe(1);
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.JobMs);
    const done = await run(ai.getJob(started.id));
    expect(done.status).toBe(AI_JOB_STATUS.Done);
    expect(done.summary).toContain('draft.example');
    expect(done.suggestions).toContainEqual(
      expect.objectContaining({ kind: SUGGESTION_KIND.Folder, folderId: data.folderList[0].id }),
    );
    expect(done.suggestions).toContainEqual(
      expect.objectContaining({ kind: SUGGESTION_KIND.Tag, tagName: data.tagList[0].name }),
    );
    expect((await run(ai.createDraft(request))).id).toBe(started.id);
    expect((await run(ai.getSettings())).usage.linksUsed).toBe(1);
    expect(await statusOf(ai.getJob('missing'))).toBe(404);
  });

  it('skips a draft while AI is off, without counting it', async () => {
    const { ai } = setup();
    const job = await run(ai.createDraft({ draftId: 'd', url: 'https://a.example' }));
    expect(job).toEqual(expect.objectContaining({ status: 'skipped', reason: AI_JOB_REASON.Off }));
    expect((await run(ai.getSettings())).usage.linksUsed).toBe(0);
  });

  it('searches by meaning only while AI and the switch are on, without word matches', async () => {
    const { ai, data } = setup();
    const off = await run(ai.searchMeaning('cooking recipes'));
    expect(off).toEqual({
      status: expect.objectContaining({ state: AI_SEARCH_STATE.Off }),
      items: [],
    });
    const on = await run(ai.updateSettings({ enabled: true }));
    expect(on.settings.meaningSearch).toBe(true);
    expect(on.search).toEqual({
      state: AI_SEARCH_STATE.Ready,
      ready: data.links.length,
      total: data.links.length,
    });
    const found = await run(ai.searchMeaning('cooking recipes'));
    expect(found.items.length).toBeGreaterThan(0);
    expect(found.items.length).toBeLessThanOrEqual(AI_SEARCH_LIMIT.MeaningDefault);
    expect(found.items[0].link.tags).toContain('recipes');
    expect(found.items[0].why[0]).toEqual({ source: MEANING_REASON_SOURCE.Tag, text: 'recipes' });
    const words = await run(ai.searchMeaning('Simple pasta recipes', 10));
    expect(words.items.map((item) => item.link.title)).not.toContain('Simple pasta');
    expect(await statusOf(ai.searchMeaning('ab'))).toBe(400);
    expect(await statusOf(ai.searchMeaning('recipes', 11))).toBe(400);
    await run(ai.updateSettings({ meaningSearch: false }));
    expect((await run(ai.searchMeaning('cooking recipes'))).items).toEqual([]);
  });

  it('reads the failure, quota and processing states of search by meaning', async () => {
    const { ai, store } = setup();
    await run(ai.updateSettings({ enabled: true }));
    expect((await run(ai.searchMeaning('recipes ai-fail'))).status.state).toBe(
      AI_SEARCH_STATE.Unavailable,
    );
    expect((await run(ai.searchMeaning('recipes ai-quota'))).status.state).toBe(
      AI_SEARCH_STATE.Quota,
    );
    store.account = { ...store.account, searchProcessing: true };
    const processing = await run(ai.searchMeaning('cooking recipes'));
    expect(processing.status.state).toBe(AI_SEARCH_STATE.Processing);
    expect(processing.status.ready).toBeLessThan(processing.status.total * 0.8);
    expect(processing.items).toEqual([]);
    expect((await run(ai.tick())).search.state).toBe(AI_SEARCH_STATE.Processing);
  });

  it('lists related links without the link itself, 404 for an unknown link', async () => {
    const { ai, data } = setup();
    const pasta = data.links.find((link) => link.title === 'Simple pasta') ?? data.links[0];
    expect((await run(ai.related(pasta.id))).items).toEqual([]);
    await run(ai.updateSettings({ enabled: true }));
    const related = await run(ai.related(pasta.id));
    expect(related.status.state).toBe(AI_SEARCH_STATE.Ready);
    expect(related.items.length).toBe(AI_SEARCH_LIMIT.RelatedDefault);
    expect(related.items.map((item) => item.link.id)).not.toContain(pasta.id);
    expect(related.items[0].why).toContainEqual({
      source: MEANING_REASON_SOURCE.Tag,
      text: 'recipes',
    });
    expect(await statusOf(ai.related('missing'))).toBe(404);
    expect(await statusOf(ai.related(pasta.id, 0))).toBe(400);
  });

  it('turns search by meaning off with Delete AI data', async () => {
    const { ai } = setup();
    await run(ai.updateSettings({ enabled: true }));
    await run(ai.deleteData());
    const after = await run(ai.getSettings());
    expect(after.settings.meaningSearch).toBe(false);
    expect(after.search.state).toBe(AI_SEARCH_STATE.Off);
  });

  it('simulates the failure states through the URL', async () => {
    const { ai } = setup();
    await run(ai.updateSettings({ enabled: true }));
    const quota = await run(ai.createDraft({ draftId: 'q', url: 'https://x.example/ai-quota' }));
    expect(quota.reason).toBe(AI_JOB_REASON.Quota);
    const fail = await run(ai.createDraft({ draftId: 'f', url: 'https://x.example/ai-fail' }));
    const refuse = await run(ai.createDraft({ draftId: 'r', url: 'https://x.example/ai-refuse' }));
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.JobMs);
    expect(await run(ai.getJob(fail.id))).toEqual(
      expect.objectContaining({ status: 'failed', reason: AI_JOB_REASON.Unavailable }),
    );
    expect((await run(ai.getJob(refuse.id))).reason).toBe(AI_JOB_REASON.Rejected);
    expect((await run(ai.getSettings())).providerStatus).toBe(AI_PROVIDER_STATUS.Unavailable);
    // "Try again" sends the same draft: it runs once more under the same job.
    const again = await run(ai.createDraft({ draftId: 'f', url: 'https://x.example/ai-fail' }));
    expect(again).toEqual(expect.objectContaining({ id: fail.id, status: 'pending' }));
  });

  it('skips with the quota reason once the month is used up', async () => {
    const { ai, store } = setup();
    await run(ai.updateSettings({ enabled: true }));
    store.account = { ...store.account, linksUsed: AI_QUOTA[AI_TIER.AiPack].linksPerMonth };
    const job = await run(ai.createDraft({ draftId: 'd', url: 'https://a.example' }));
    expect(job.reason).toBe(AI_JOB_REASON.Quota);
  });

  it('picks up a finished draft on save and applies Automatic mode only to what is empty', async () => {
    const { ai, links, data } = setup();
    await run(ai.updateSettings({ enabled: true, folderMode: AI_FEATURE_MODE.Auto }));
    const title = namedTitle(data);
    const url = 'https://auto.example/page';
    await run(ai.createDraft({ draftId: 'd-auto', url, title }));
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.JobMs);
    const link = await run(links.create({ url, title, aiDraftId: 'd-auto' }));
    expect(link.folderId).toBe(data.folderList[0].id);
    expect(link.summarySource).toBe(SUMMARY_SOURCE.Ai);
    expect(link.aiStatus).toBe(AI_JOB_STATUS.Done);
    const state = await run(ai.getLinkAi(link.id));
    expect(state.autoApplied).toEqual({ folderId: data.folderList[0].id, tags: [] });
    expect(state.suggestions).toContainEqual(
      expect.objectContaining({
        kind: SUGGESTION_KIND.Folder,
        state: SUGGESTION_STATE.AutoApplied,
      }),
    );
    const undone = await run(ai.undoApply(link.id, { part: AI_APPLIED_PART.Folder }));
    expect(undone.folderId).toBeNull();
    expect((await run(ai.getLinkAi(link.id))).autoApplied).toBeNull();
    expect(await statusOf(ai.undoApply('missing', { part: AI_APPLIED_PART.Tags }))).toBe(404);
  });

  it('auto-applies existing tags to a link saved without tags, and the user’s edit keeps them', async () => {
    const { ai, links, data } = setup();
    await run(ai.updateSettings({ enabled: true, tagsMode: AI_FEATURE_MODE.Auto }));
    const link = await run(links.create({ url: 'https://tags.example/', title: namedTitle(data) }));
    expect(link.aiStatus).toBe(AI_JOB_STATUS.Pending);
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.JobMs);
    const state = await run(ai.getLinkAi(link.id));
    expect(state.autoApplied?.tags).toContain(data.tagList[0].name);
    const saved = data.links.find((item) => item.id === link.id);
    expect(saved?.tags).toContain(data.tagList[0].name);
    await run(links.update(link.id, { tags: [data.tagList[0].name, 'mine'] }));
    expect((await run(ai.getLinkAi(link.id))).autoApplied).toBeNull();
  });

  it('queues a job per saved link only while AI is on', async () => {
    const { ai, links } = setup();
    const off = await run(links.create({ url: 'https://off.example/' }));
    expect(off.aiStatus).toBeNull();
    await run(ai.updateSettings({ enabled: true }));
    const batch = await run(
      links.createBatch({ items: [{ url: 'https://b.example/1', idempotencyKey: 'k1' }] }),
    );
    expect(batch.links[0].aiStatus).toBe(AI_JOB_STATUS.Pending);
    expect((await run(ai.tick())).pendingJobs).toBe(1);
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.JobMs);
    expect((await run(ai.tick())).pendingJobs).toBe(0);
    expect((await run(ai.tick())).cleanup).toBe('none');
    expect((await run(ai.getLinkAi(batch.links[0].id))).summary).toContain('b.example');
  });

  it('keeps the user’s summary: an edit makes it theirs, rewrite is refused, blank clears it', async () => {
    const { ai, links } = setup();
    await run(ai.updateSettings({ enabled: true }));
    const link = await run(links.create({ url: 'https://sum.example/' }));
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.JobMs);
    const rewritten = await run(ai.rewriteSummary(link.id));
    expect(rewritten.summary).toMatch(/^In short:/);
    const edited = await run(links.update(link.id, { summary: '  My words  ' }));
    expect(edited).toEqual(
      expect.objectContaining({ summary: 'My words', summarySource: SUMMARY_SOURCE.User }),
    );
    expect(await statusOf(ai.rewriteSummary(link.id))).toBe(409);
    const cleared = await run(links.update(link.id, { summary: ' ' }));
    expect(cleared.summary).toBeNull();
    expect(cleared.summarySource).toBeNull();
    expect(await statusOf(links.update(link.id, { summary: 'x'.repeat(301) }))).toBe(400);
    expect(await statusOf(ai.rewriteSummary('missing'))).toBe(404);
  });

  it('dismisses a suggestion once', async () => {
    const { ai, data } = setup();
    await run(ai.updateSettings({ enabled: true }));
    const job = await run(
      ai.createDraft({ draftId: 'd', url: 'https://d.example/', title: namedTitle(data) }),
    );
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.JobMs);
    const [first] = (await run(ai.getJob(job.id))).suggestions;
    await run(ai.dismissSuggestion(first.id));
    expect((await run(ai.getJob(job.id))).suggestions.map((item) => item.id)).not.toContain(
      first.id,
    );
    expect(await statusOf(ai.dismissSuggestion(first.id))).toBe(404);
  });

  it('processes existing links in the background, never auto-applying, and can stop', async () => {
    const { ai, data } = setup();
    expect(await statusOf(ai.startBackfill())).toBe(409);
    await run(ai.updateSettings({ enabled: true, folderMode: AI_FEATURE_MODE.Auto }));
    const idle = await run(ai.getBackfill());
    expect(idle.state).toBe(AI_BACKFILL_STATE.Idle);
    expect(idle.eligible).toBe(data.links.length);
    expect(idle.estimatedMinutes).toBeGreaterThan(0);
    const started = await run(ai.startBackfill());
    expect(started.state).toBe(AI_BACKFILL_STATE.Running);
    expect(await statusOf(ai.startBackfill())).toBe(409);
    const unsorted = data.links.filter((link) => link.folderId === null).length;
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.BackfillLinkMs * 2);
    const stopped = await run(ai.stopBackfill());
    expect(stopped.state).toBe(AI_BACKFILL_STATE.Stopped);
    expect(stopped.done).toBeGreaterThan(0);
    expect(data.links.filter((link) => link.folderId === null).length).toBe(unsorted);
    expect((await run(ai.getSettings())).usage.backfillUsed).toBe(stopped.done);
    await run(ai.startBackfill());
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.BackfillLinkMs * data.links.length);
    const done = await run(ai.getBackfill());
    expect(done.state).toBe(AI_BACKFILL_STATE.Done);
    expect(done.eligible).toBe(0);
    expect(done.estimatedMinutes).toBeNull();
  });

  it('turning AI off skips pending jobs and stops the backfill', async () => {
    const { ai, links } = setup();
    await run(ai.updateSettings({ enabled: true }));
    const link = await run(links.create({ url: 'https://p.example/' }));
    await run(ai.startBackfill());
    const off = await run(ai.updateSettings({ enabled: false }));
    expect(off.pendingJobs).toBe(0);
    expect(off.backfill.state).toBe(AI_BACKFILL_STATE.Stopped);
    expect((await run(ai.getLinkAi(link.id))).reason).toBe(AI_JOB_REASON.Off);
  });

  it('deletes AI summaries and suggestions but keeps the user’s summaries', async () => {
    const { ai, links } = setup();
    await run(ai.updateSettings({ enabled: true }));
    const mine = await run(links.create({ url: 'https://mine.example/' }));
    const theirs = await run(links.create({ url: 'https://ai.example/' }));
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.JobMs);
    await run(links.update(mine.id, { summary: 'Mine' }));
    await run(ai.deleteData());
    expect((await run(ai.getLinkAi(mine.id))).summary).toBe('Mine');
    const state = await run(ai.getLinkAi(theirs.id));
    expect(state).toEqual(
      expect.objectContaining({ summary: null, aiStatus: null, suggestions: [] }),
    );
    expect(await statusOf(ai.getLinkAi('missing'))).toBe(404);
  });
  it("queues a new job when the address of a link changes, unless the summary is the user's", async () => {
    const { ai, links, data } = setup();
    await run(ai.updateSettings({ enabled: true }));
    const link = await run(
      links.create({ url: 'https://first.example/', title: namedTitle(data) }),
    );
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.JobMs);
    expect((await run(ai.getLinkAi(link.id))).aiStatus).toBe(AI_JOB_STATUS.Done);

    const moved = await run(links.update(link.id, { url: 'https://second.example/' }));
    expect(moved.aiStatus).toBe(AI_JOB_STATUS.Pending);
    await vi.advanceTimersByTimeAsync(MOCK_AI_TIMING.JobMs);
    expect((await run(ai.getLinkAi(link.id))).aiStatus).toBe(AI_JOB_STATUS.Done);

    await run(links.update(link.id, { summary: 'Mine.' }));
    const again = await run(links.update(link.id, { url: 'https://third.example/' }));
    expect(again.aiStatus).toBe(AI_JOB_STATUS.Done);
    expect(again.summary).toBe('Mine.');
  });

  it('serves Tidy: empty while off, 409 to apply while off, 400 for a bad body', async () => {
    const { ai } = setup();
    expect(await run(ai.getTidy())).toEqual({ items: [], total: 0 });
    expect(await run(ai.getTidyCount())).toEqual({ total: 0 });
    const item = { linkId: 'l1', suggestionIds: ['s1'] };
    expect(await statusOf(ai.applyTidy({ items: [item] }))).toBe(409);
    expect(await statusOf(ai.applyTidy({ items: [] }))).toBe(400);
    expect(await statusOf(ai.applyTidy({ items: [item, item] }))).toBe(400);
    expect(await run(ai.undoTidy({ items: [{ ...item, folderId: null, tags: [] }] }))).toEqual({
      links: [],
    });
    expect(await statusOf(ai.undoTidy({ items: [] }))).toBe(400);
  });
});
