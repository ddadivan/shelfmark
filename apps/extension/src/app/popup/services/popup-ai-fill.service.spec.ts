import { TestBed } from '@angular/core/testing';
import { AI_JOB_REASON, AI_JOB_STATUS, AI_LIMIT, SUGGESTION_KIND } from '@shelfmark/contracts';
import { fakeData, fakePopupDeps, type FakeData } from '../../../testing/fake-popup-deps';
import {
  makeAiJob,
  makeAiSettings,
  makeFolder,
  makeSuggestion as suggestion,
} from '../../../testing/fixtures';
import { AI_FILL_STATE } from '../models/ai-fill-state.const';
import { AI_POLL_INTERVAL_MS } from '../models/ai-poll-interval-ms.const';
import { PopupStore } from '../popup.store';
import { PopupAiFillService } from './popup-ai-fill.service';

const ON = makeAiSettings({ settings: { enabled: true } });

async function setup(overrides: Partial<FakeData> = {}) {
  const deps = fakePopupDeps(
    fakeData({ ai: ON, folders: [makeFolder({ id: 'f1', name: 'Reading' })], ...overrides }),
  );
  TestBed.configureTestingModule({ providers: deps.providers });
  const store = TestBed.inject(PopupStore);
  await store.init();
  return { store, ai: TestBed.inject(PopupAiFillService), ...deps };
}

describe('PopupAiFillService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  describe('without AI', () => {
    it.each([
      ['off', makeAiSettings()],
      [
        'Free without an allowance',
        makeAiSettings({ settings: { enabled: true }, usage: { linksLimit: 0 } }),
      ],
    ])('shows nothing when AI is %s', async (_name, ai) => {
      const { ai: service, api } = await setup({ ai });
      expect(service.on()).toBe(false);
      expect(service.buttonShown()).toBe(false);
      expect(service.line()).toBeNull();
      await service.fill({ url: 'https://a.b/', title: 't', host: 'a.b' });
      expect(api.createAiDraft).not.toHaveBeenCalled();
    });

    it('shows nothing when the settings call fails, and the form still opens', async () => {
      const deps = fakePopupDeps(fakeData());
      deps.api.aiSettings.mockRejectedValue(new Error('404'));
      TestBed.configureTestingModule({ providers: deps.providers });
      const store = TestBed.inject(PopupStore);
      await store.init();
      expect(store.ai.buttonShown()).toBe(false);
      expect(store.view()).toBe('form');
    });
  });

  it('asks for no draft on open, only on the click', async () => {
    const { ai, api } = await setup();
    expect(ai.buttonShown()).toBe(true);
    expect(api.createAiDraft).not.toHaveBeenCalled();
    expect(ai.draftId()).toBeNull();
  });

  it('sends the address without the fragment, and the title, on the click', async () => {
    const { store, api } = await setup({
      tab: { url: 'https://www.example.com/post#top', title: 'A post' },
    });
    await store.fillWithAi();
    expect(api.createAiDraft).toHaveBeenCalledWith({
      draftId: expect.any(String),
      url: 'https://www.example.com/post',
      title: 'A post',
    });
  });

  it('sends the note with "Include my notes"', async () => {
    const include = makeAiSettings({ settings: { enabled: true, includeNotes: true } });
    const { store, api } = await setup({ ai: include });
    store.note.set(' for later ');
    await store.fillWithAi();
    expect(api.createAiDraft.mock.calls[0]?.[0].note).toBe('for later');
  });

  it('sends no note while "Include my notes" is off', async () => {
    const off = await setup();
    off.store.note.set('private');
    await off.store.fillWithAi();
    expect(off.api.createAiDraft.mock.calls[0]?.[0]).not.toHaveProperty('note');
  });

  it('polls the job until done, then fills the folder and the existing tags', async () => {
    vi.useFakeTimers();
    const pending = makeAiJob({ status: AI_JOB_STATUS.Pending });
    const done = makeAiJob({
      suggestions: [
        suggestion('s1', SUGGESTION_KIND.Folder, { folderId: 'f1' }),
        suggestion('s2', SUGGESTION_KIND.Tag, { tagName: 'signals' }),
        suggestion('s3', SUGGESTION_KIND.NewTag, { tagName: 'zoneless' }),
      ],
    });
    const { store, ai, api } = await setup({ draft: pending });
    api.aiJob.mockResolvedValue(done);
    const run = store.fillWithAi();
    await vi.advanceTimersByTimeAsync(0);
    expect(ai.busy()).toBe(true);
    await vi.advanceTimersByTimeAsync(AI_POLL_INTERVAL_MS);
    await run;
    expect(api.aiJob).toHaveBeenCalledWith('job-1');
    expect(ai.state()).toBe(AI_FILL_STATE.Ready);
    expect(store.folderId()).toBe('f1');
    expect(store.chosenTags()).toEqual(['signals']);
    expect(ai.folderMarked()).toBe(true);
    expect(ai.tagsMarked()).toBe(true);
    // A new tag stays a chip until it is taken.
    expect(ai.chips().map((chip) => chip.name)).toEqual(['zoneless']);
    expect(ai.buttonShown()).toBe(false);
    const [chip] = ai.chips();
    if (chip === undefined) throw new Error('expected a chip');
    ai.accept(chip);
    expect(store.chosenTags()).toEqual(['signals', 'zoneless']);
    expect(ai.chips()).toEqual([]);
  });

  it('never replaces what the user chose', async () => {
    const job = makeAiJob({
      suggestions: [
        suggestion('s1', SUGGESTION_KIND.Folder, { folderId: 'f1' }),
        suggestion('s2', SUGGESTION_KIND.Tag, { tagName: 'Signals' }),
        suggestion('s3', SUGGESTION_KIND.Tag, { tagName: 'rxjs' }),
      ],
    });
    const { store, ai } = await setup({
      draft: job,
      folders: [makeFolder({ id: 'f1' }), makeFolder({ id: 'f2' })],
    });
    store.folderId.set('f2');
    store.chosenTags.set(['signals']);
    await store.fillWithAi();
    expect(store.folderId()).toBe('f2');
    expect(store.chosenTags()).toEqual(['signals', 'rxjs']);
    expect(ai.folderMarked()).toBe(false);
  });

  it('keeps a folder the user named for a new folder', async () => {
    const job = makeAiJob({
      suggestions: [suggestion('s1', SUGGESTION_KIND.Folder, { folderId: 'f1' })],
    });
    const { store } = await setup({ draft: job });
    store.chooseNewFolder('Clothes');
    await store.fillWithAi();
    expect(store.folderId()).toBeNull();
    expect(store.newFolderName()).toBe('Clothes');
  });

  it('drops the spark mark when the user changes the folder', async () => {
    const job = makeAiJob({
      suggestions: [suggestion('s1', SUGGESTION_KIND.Folder, { folderId: 'f1' })],
    });
    const { store, ai } = await setup({ draft: job });
    await store.fillWithAi();
    expect(ai.folderMarked()).toBe(true);
    store.chooseFolder(null);
    expect(ai.folderMarked()).toBe(false);
  });

  it('collapses when the job is too slow, and still sends the draft id on Save', async () => {
    vi.useFakeTimers();
    const { store, ai, api } = await setup({
      draft: makeAiJob({ status: AI_JOB_STATUS.Pending }),
    });
    api.aiJob.mockResolvedValue(makeAiJob({ status: AI_JOB_STATUS.Pending }));
    const run = store.fillWithAi();
    await vi.advanceTimersByTimeAsync(AI_LIMIT.DraftPollMaxMs);
    await run;
    expect(ai.state()).toBe(AI_FILL_STATE.Hidden);
    expect(ai.buttonShown()).toBe(false);
    expect(ai.line()).toBeNull();
    await store.save();
    expect(api.create.mock.calls[0]?.[0].aiDraftId).toBe(
      api.createAiDraft.mock.calls[0]?.[0].draftId,
    );
  });

  it('shows the limit line, no button and no error', async () => {
    const job = makeAiJob({ status: AI_JOB_STATUS.Skipped, reason: AI_JOB_REASON.Quota });
    const { store, ai } = await setup({ draft: job });
    await store.fillWithAi();
    expect(ai.state()).toBe(AI_FILL_STATE.Quota);
    expect(ai.line()).toEqual({ kind: 'limit', resetsOn: '2026-12-01', limit: 50 });
    expect(ai.buttonShown()).toBe(false);
    expect(store.failure()).toBeNull();
  });

  it.each([
    [
      'a provider outage',
      makeAiJob({ status: AI_JOB_STATUS.Failed, reason: AI_JOB_REASON.Unavailable }),
      false,
    ],
    ['a failed request', makeAiJob(), true],
  ])(
    'shows the unavailable line after %s and lets the user try again with the same id',
    async (_n, job, rejects) => {
      const { store, ai, api } = await setup({ draft: job });
      if (rejects) api.createAiDraft.mockRejectedValueOnce(new Error('500'));
      await store.fillWithAi();
      expect(ai.state()).toBe(AI_FILL_STATE.Unavailable);
      expect(ai.line()).toEqual({ kind: 'unavailable' });
      expect(ai.buttonShown()).toBe(true);
      expect(store.failure()).toBeNull();
      api.createAiDraft.mockResolvedValue(makeAiJob());
      await store.fillWithAi();
      expect(api.createAiDraft.mock.calls[1]?.[0].draftId).toBe(
        api.createAiDraft.mock.calls[0]?.[0].draftId,
      );
      expect(ai.state()).toBe(AI_FILL_STATE.Ready);
    },
  );

  it('collapses silently when the job has nothing for the user', async () => {
    const job = makeAiJob({ status: AI_JOB_STATUS.Skipped, reason: AI_JOB_REASON.NothingFound });
    const { store, ai } = await setup({ draft: job });
    await store.fillWithAi();
    expect(ai.state()).toBe(AI_FILL_STATE.Hidden);
    expect(ai.line()).toBeNull();
  });

  describe('Save', () => {
    it('sends aiDraftId once a draft was asked for', async () => {
      const { store, api } = await setup();
      await store.fillWithAi();
      await store.save();
      expect(api.create.mock.calls[0]?.[0].aiDraftId).toBe(
        api.createAiDraft.mock.calls[0]?.[0].draftId,
      );
    });

    it('sends no aiDraftId without a click', async () => {
      const { store, api } = await setup();
      await store.save();
      expect(api.create.mock.calls[0]?.[0]).not.toHaveProperty('aiDraftId');
    });

    it('sends no aiDraftId when AI is off', async () => {
      const { store, api } = await setup({ ai: makeAiSettings() });
      await store.fillWithAi();
      await store.save();
      expect(api.create.mock.calls[0]?.[0]).not.toHaveProperty('aiDraftId');
    });
  });
});
