import { TestBed } from '@angular/core/testing';
import { AI_JOB_REASON, AI_JOB_STATUS, SUGGESTION_KIND } from '@shelfmark/contracts';
import { fakeData, fakePopupDeps, type FakeData } from '../../../testing/fake-popup-deps';
import {
  makeAiJob,
  makeAiSettings,
  makeFolder,
  makeSuggestion as suggestion,
  makeWindowTab,
} from '../../../testing/fixtures';
import { AI_FILL_STATE } from '../models/ai-fill-state.const';
import { AI_LINE_KIND } from '../models/ai-line-kind.const';
import { AI_POLL_INTERVAL_MS } from '../models/ai-poll-interval-ms.const';
import { SAVE_MODE } from '../models/save-mode.const';
import { TABS_AI_MAX } from '../models/tabs-ai-max.const';
import { PopupStore } from '../popup.store';

const ON = makeAiSettings({ settings: { enabled: true } });
const FOLDERS = [
  makeFolder({ id: 'f-ng', name: 'Angular' }),
  makeFolder({ id: 'f-web', name: 'Web' }),
  makeFolder({ id: 'f-shared', name: 'Shared' }),
];
const windowTabs = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    makeWindowTab(i + 1, `https://a.test/${i + 1}#top`, { active: i === 0, title: `Tab ${i + 1}` }),
  );

const sorted = (folderId: string, ...tags: [string, boolean][]) =>
  makeAiJob({
    suggestions: [
      suggestion('s0', SUGGESTION_KIND.Folder, { folderId }),
      ...tags.map(([name, isNew], i) =>
        suggestion(`s${i + 1}`, isNew ? SUGGESTION_KIND.NewTag : SUGGESTION_KIND.Tag, {
          tagName: name,
        }),
      ),
    ],
  });

async function setup(count = 3, overrides: Partial<FakeData> = {}) {
  const deps = fakePopupDeps(
    fakeData({
      ai: ON,
      folders: FOLDERS,
      windowTabs: windowTabs(count),
      tabsPermission: true,
      ...overrides,
    }),
  );
  TestBed.configureTestingModule({ providers: deps.providers });
  const store = TestBed.inject(PopupStore);
  await store.init();
  await store.setMode(SAVE_MODE.Tabs);
  return { store, ai: store.tabsAi, list: store.tabList, ...deps };
}

describe('PopupTabsAiService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('shows the button only in All tabs, with the count of ticked tabs, and asks for nothing yet', async () => {
    const { store, ai, api } = await setup();
    expect(ai.buttonShown()).toBe(true);
    expect(ai.sortCount()).toBe(3);
    expect(api.createAiDraft).not.toHaveBeenCalled();
    await store.setMode(SAVE_MODE.Page);
    expect(ai.buttonShown()).toBe(false);
  });

  it('has no button without AI', async () => {
    const { ai } = await setup(3, { ai: makeAiSettings() });
    expect(ai.buttonShown()).toBe(false);
  });

  it('asks one draft per ticked tab, each with its own id, the address without fragment and the title', async () => {
    const { ai, list, api } = await setup();
    list.toggle(list.entries()[2]!.key);
    await ai.sort();
    expect(api.createAiDraft).toHaveBeenCalledTimes(2);
    const bodies = api.createAiDraft.mock.calls.map(([body]) => body);
    expect(bodies.map((body) => body.url)).toEqual(['https://a.test/1', 'https://a.test/2']);
    expect(bodies.map((body) => body.title)).toEqual(['Tab 1', 'Tab 2']);
    expect(new Set(bodies.map((body) => body.draftId)).size).toBe(2);
  });

  it('gives each tab its folder and at most two tags, and hides the button after', async () => {
    const { ai, list, api } = await setup(1 + 1);
    api.createAiDraft.mockResolvedValueOnce(
      sorted('f-ng', ['signals', false], ['forms', false], ['third', false]),
    );
    api.createAiDraft.mockResolvedValueOnce(sorted('f-web', ['animation', true]));
    await ai.sort();
    const [first, second] = list.entries();
    expect(ai.row(first!.key)).toMatchObject({
      status: 'done',
      folderId: 'f-ng',
      tags: [
        { name: 'signals', isNew: false },
        { name: 'forms', isNew: false },
      ],
    });
    expect(ai.row(second!.key)?.tags).toEqual([{ name: 'animation', isNew: true }]);
    expect(ai.state()).toBe(AI_FILL_STATE.Ready);
    expect(ai.buttonShown()).toBe(false);
    expect(ai.picksActive()).toBe(true);
    expect(ai.shownFolder(first!.key)).toBe('f-ng');
  });

  it('ignores a folder AI picked that is not one of the user’s', async () => {
    const { ai, list, api } = await setup(2);
    api.createAiDraft.mockResolvedValue(sorted('gone', ['x', false]));
    await ai.sort();
    expect(ai.row(list.entries()[0]!.key)?.folderId).toBeNull();
    expect(ai.picksActive()).toBe(false);
  });

  it('polls a pending draft until it is done', async () => {
    vi.useFakeTimers();
    const { ai, list, api } = await setup(2);
    api.createAiDraft.mockResolvedValue(makeAiJob({ id: 'j', status: AI_JOB_STATUS.Pending }));
    api.aiJob.mockResolvedValue(sorted('f-ng', ['a', false]));
    const run = ai.sort();
    await vi.advanceTimersByTimeAsync(0);
    expect(ai.busy()).toBe(true);
    expect(ai.row(list.entries()[0]!.key)?.status).toBe('working');
    await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS * 3);
    await run;
    expect(api.aiJob).toHaveBeenCalled();
    expect(ai.state()).toBe(AI_FILL_STATE.Ready);
  });

  it('lets a tab that is still pending after the wait save without suggestions, keeping its draft id', async () => {
    vi.useFakeTimers();
    const { ai, list, api } = await setup(2);
    api.createAiDraft.mockResolvedValue(makeAiJob({ id: 'j', status: AI_JOB_STATUS.Pending }));
    api.aiJob.mockResolvedValue(makeAiJob({ id: 'j', status: AI_JOB_STATUS.Pending }));
    const run = ai.sort();
    await vi.advanceTimersByTimeAsync(60_000);
    await run;
    const entry = list.entries()[0]!;
    expect(ai.row(entry.key)?.status).toBe('none');
    expect(ai.pick(entry).draftId).toEqual(expect.any(String));
    expect(ai.state()).toBe(AI_FILL_STATE.Hidden);
  });

  it('keeps the shared folder for the rest and shows the limit line when the allowance runs out', async () => {
    const { ai, list, api } = await setup(6);
    api.createAiDraft
      .mockResolvedValueOnce(sorted('f-ng', ['a', false]))
      .mockResolvedValue(makeAiJob({ status: AI_JOB_STATUS.Skipped, reason: AI_JOB_REASON.Quota }));
    await ai.sort();
    expect(ai.state()).toBe(AI_FILL_STATE.Ready);
    expect(ai.line()).toMatchObject({ kind: AI_LINE_KIND.Limit, limit: 50 });
    const entries = list.entries();
    expect(ai.row(entries[0]!.key)?.status).toBe('done');
    expect(ai.row(entries[5]!.key)?.status).toBe('none');
    expect(ai.pick(entries[5]!)).toEqual({ draftId: null, folderId: null, tags: [] });
    expect(ai.ownFolder(entries[5]!.key)).toBeNull();
    // Drafts after the quota answer are not even asked for.
    expect(api.createAiDraft.mock.calls.length).toBeLessThan(6);
  });

  it('shows the limit state when every tab hit the allowance', async () => {
    const { ai, api } = await setup(2);
    api.createAiDraft.mockResolvedValue(
      makeAiJob({ status: AI_JOB_STATUS.Skipped, reason: AI_JOB_REASON.Quota }),
    );
    await ai.sort();
    expect(ai.state()).toBe(AI_FILL_STATE.Quota);
    expect(ai.buttonShown()).toBe(true);
  });

  it('answers "not available" when the requests fail, and can try again', async () => {
    const { ai, api } = await setup(2);
    api.createAiDraft.mockRejectedValue(new Error('down'));
    await ai.sort();
    expect(ai.state()).toBe(AI_FILL_STATE.Unavailable);
    expect(ai.line()).toEqual({ kind: AI_LINE_KIND.Unavailable });
    api.createAiDraft.mockResolvedValue(sorted('f-ng', ['a', false]));
    await ai.sort();
    expect(ai.state()).toBe(AI_FILL_STATE.Ready);
  });

  it('sorts at most TABS_AI_MAX tabs per click', async () => {
    const { ai, api } = await setup(TABS_AI_MAX + 5);
    expect(ai.sortCount()).toBe(TABS_AI_MAX);
    await ai.sort();
    expect(api.createAiDraft).toHaveBeenCalledTimes(TABS_AI_MAX);
  });

  describe('folders', () => {
    async function sortedSetup() {
      const ctx = await setup(3);
      ctx.api.createAiDraft.mockResolvedValueOnce(sorted('f-ng', ['a', false]));
      ctx.api.createAiDraft.mockResolvedValueOnce(sorted('f-web', ['b', false]));
      ctx.api.createAiDraft.mockResolvedValueOnce(sorted('f-web', ['c', false]));
      await ctx.ai.sort();
      return ctx;
    }

    it('lets the user pick another folder for one link', async () => {
      const { ai, list } = await sortedSetup();
      const [a, b] = list.entries();
      ai.setFolder(a!.key, 'f-web');
      expect(ai.ownFolder(a!.key)).toBe('f-web');
      expect(ai.ownFolder(b!.key)).toBe('f-web');
      expect(ai.pick(a!).folderId).toBe('f-web');
    });

    it('puts every link in the folder chosen for all, keeping the AI tags, and Keep AI picks undoes it', async () => {
      const { store, ai, list } = await sortedSetup();
      const [a, b] = list.entries();
      ai.setFolder(a!.key, 'f-web');
      store.chooseFolder('f-shared');
      expect(ai.picksActive()).toBe(false);
      expect(ai.ownFolder(a!.key)).toBeNull();
      expect(ai.shownFolder(a!.key)).toBe('f-shared');
      expect(ai.pick(b!)).toMatchObject({ folderId: null, tags: ['b'] });
      store.keepAiPicks();
      expect(ai.picksActive()).toBe(true);
      expect(ai.shownFolder(a!.key)).toBe('f-ng');
      expect(ai.pick(a!).folderId).toBe('f-ng');
    });

    it('opens the picker for one link and chooses into it, back to the form', async () => {
      const { store, ai, list } = await sortedSetup();
      const a = list.entries()[0]!;
      store.openPicker(a.key);
      expect(store.view()).toBe('picker');
      store.chooseFolder('f-shared');
      expect(store.view()).toBe('form');
      expect(ai.ownFolder(a.key)).toBe('f-shared');
      expect(store.folderId()).toBeNull();
      expect(store.pickerTarget()).toBeNull();
    });

    it('gives a tab ticked after the sort no suggestions: it takes the shared folder', async () => {
      const { ai, list } = await setup(3);
      const late = list.entries()[2]!;
      list.toggle(late.key);
      await ai.sort();
      list.toggle(late.key);
      expect(ai.row(late.key)).toBeUndefined();
      expect(ai.pick(late)).toEqual({ draftId: null, folderId: null, tags: [] });
    });
  });
});
