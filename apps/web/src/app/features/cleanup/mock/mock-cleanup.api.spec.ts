import { HttpErrorResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import { AI_TIER, CLEANUP_SOURCE, CLEANUP_STATE, DUPLICATE_REASON } from '@shelfmark/contracts';
import { firstValueFrom, type Observable } from 'rxjs';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MockAiData } from '../../ai/mock/mock-ai-data';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockCleanupApi } from './mock-cleanup.api';
import { MockCleanupData } from './mock-cleanup-data';
import { MOCK_CLEANUP_TIMING } from './models/mock-cleanup-timing.const';

async function run<T>(source: Observable<T>): Promise<T> {
  const result = firstValueFrom(source);
  await vi.advanceTimersByTimeAsync(2_000);
  return result;
}

async function failure(source: Observable<unknown>): Promise<HttpErrorResponse> {
  const result = firstValueFrom(source).then(
    () => {
      throw new Error('expected a failure');
    },
    (error: unknown) => error as HttpErrorResponse,
  );
  await vi.advanceTimersByTimeAsync(2_000);
  return result;
}

/** The demo library; `aiPack` opens the AI checks up (AI on, AI pack). */
function setup(aiPack = false) {
  localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify({ isDemo: true }));
  const injector = Injector.create({
    providers: [MockLibraryData, MockAiData, MockCleanupData, MockCleanupApi],
  });
  if (aiPack) {
    const ai = injector.get(MockAiData);
    ai.account = { ...ai.account, tier: AI_TIER.AiPack };
  }
  return {
    api: injector.get(MockCleanupApi),
    library: injector.get(MockLibraryData),
    data: injector.get(MockCleanupData),
  };
}

describe('MockCleanupApi', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('reads `none` before a run and finds the demo duplicates by rule for a Free account', async () => {
    const { api } = setup();
    expect((await run(api.getReport())).state).toBe(CLEANUP_STATE.None);
    const report = await run(api.run({ includeAi: true }));
    expect(report.state).toBe(CLEANUP_STATE.Ready);
    expect(report.aiIncluded).toBe(false);
    expect(report.aiAvailable).toBe(false);
    expect(report.similarTags).toEqual([]);
    const [group] = report.duplicates;
    expect(report.duplicates).toHaveLength(1);
    expect(group?.reason).toBe(DUPLICATE_REASON.SameAddress);
    expect(group?.keep.title).toBe('Hacker News');
    expect(group?.keep.tags).toEqual(['reading']);
    expect(group?.keepReason).toBe('more-tags');
    expect(group?.copies).toHaveLength(2);
  });

  it('runs the AI checks in the background: progress, then same-page groups and synonyms', async () => {
    const { api, data } = setup(true);
    const started = await run(api.run({ includeAi: true }));
    expect(started.state).toBe(CLEANUP_STATE.Running);
    expect(started.aiIncluded).toBe(true);
    expect(started.total).toBeGreaterThan(0);
    expect(data.state()).toBe(CLEANUP_STATE.Running);
    expect((await failure(api.run({ includeAi: false }))).status).toBe(409);
    await vi.advanceTimersByTimeAsync(MOCK_CLEANUP_TIMING.PassMs);
    const report = await run(api.getReport());
    expect(report.state).toBe(CLEANUP_STATE.Ready);
    expect(report.checked).toBe(report.total);
    const page = report.duplicates.find((group) => group.reason === DUPLICATE_REASON.SamePage);
    expect(page?.source).toBe(CLEANUP_SOURCE.Ai);
    expect(page?.keep.url).toBe('https://angular.dev/guide/signals');
    expect(page?.keepReason).toBe('in-folder');
    expect(report.similarTags.map((pair) => `${pair.keep.name}<${pair.merge.name}`)).toEqual([
      'javascript<js',
      'recipes<cooking',
    ]);
  });

  it('applies in one step with one Trash time and reverts the whole run with Undo', async () => {
    const { api, library } = setup(true);
    await run(api.run({ includeAi: true }));
    await vi.advanceTimersByTimeAsync(MOCK_CLEANUP_TIMING.PassMs);
    const report = await run(api.getReport());
    const before = library.links.length;
    const pair = report.similarTags[0];
    const response = await run(
      api.apply({
        duplicates: report.duplicates.map((group) => ({
          groupId: group.id,
          trashIds: group.copies.map((copy) => copy.id),
        })),
        tagMerges: pair ? [{ pairId: pair.id, keepTagId: pair.merge.id }] : [],
      }),
    );
    expect(response).toMatchObject({ trashed: 3, merged: 1, skipped: 0 });
    expect(library.links).toHaveLength(before - 3);
    expect(new Set(library.trash.map((entry) => entry.deletedAt)).size).toBe(1);
    expect(library.tagList.some((tag) => tag.name === 'javascript')).toBe(false);
    expect((await run(api.getReport())).state).toBe(CLEANUP_STATE.Applied);

    expect(await run(api.undo(response.undo))).toEqual({ restored: 3, unmerged: 1 });
    expect(library.links).toHaveLength(before);
    expect(library.trash).toHaveLength(0);
    const tagged = library.links.filter((link) => link.tags.includes('javascript'));
    expect(tagged).toHaveLength(2);
    expect(library.links.filter((link) => link.tags.includes('js'))).toHaveLength(1);
    expect((await run(api.getReport())).state).toBe(CLEANUP_STATE.Ready);
  });

  it('skips items outside the report and never trashes every member; 400 for an empty apply', async () => {
    const { api } = setup();
    const [group] = (await run(api.run({ includeAi: false }))).duplicates;
    const all = group ? [group.keep.id, ...group.copies.map((copy) => copy.id)] : [];
    const response = await run(
      api.apply({
        duplicates: [
          { groupId: group?.id ?? '', trashIds: all },
          { groupId: 'other', trashIds: ['x'] },
        ],
        tagMerges: [{ pairId: 'nope', keepTagId: 't1' }],
      }),
    );
    expect(response).toMatchObject({ trashed: 0, merged: 0, skipped: 3 });
    expect(response.undo.deletedAt).toBeNull();
    expect((await failure(api.apply({ duplicates: [], tagMerges: [] }))).status).toBe(400);
  });

  it('shows the card while something is found and hides it for a month after a dismissal', async () => {
    const { api } = setup();
    expect(await run(api.getSummary())).toEqual({ show: true, duplicates: 1, similarTags: 0 });
    await run(api.dismissCard());
    expect((await run(api.getSummary())).show).toBe(false);
  });
});
