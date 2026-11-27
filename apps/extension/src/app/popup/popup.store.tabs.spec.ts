import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LINK_BATCH_ERROR_CODE, SUGGESTION_KIND } from '@shelfmark/contracts';
import { fakeData, fakePopupDeps, type FakeData } from '../../testing/fake-popup-deps';
import {
  makeAiJob,
  makeAiSettings,
  makeFolder,
  makeLink,
  makeSuggestion as suggestion,
  makeWindowTab,
} from '../../testing/fixtures';
import { SHELFMARK_ORIGIN } from '../core/config/shelfmark-origin.const';
import { SAVE_MODE } from './models/save-mode.const';
import { PopupStore } from './popup.store';
import { at } from '../../testing/at';

const FOLDERS = [
  makeFolder({ id: 'f1', name: 'Reading' }),
  makeFolder({ id: 'f2', name: 'Tools' }),
];
const WINDOW = [
  makeWindowTab(11, 'https://a.test/1', {
    active: true,
    title: 'One',
    favIconUrl: 'https://a.test/i.png',
  }),
  makeWindowTab(12, 'https://b.test/2', { title: 'Two' }),
  makeWindowTab(13, 'https://c.test/3', { title: 'Three' }),
];

async function setup(overrides: Partial<FakeData> = {}) {
  const deps = fakePopupDeps(
    fakeData({
      folders: FOLDERS,
      windowTabs: WINDOW,
      tabsPermission: true,
      batch: { links: WINDOW.map(() => makeLink({ folderId: 'f1' })), errors: [] },
      ...overrides,
    }),
  );
  TestBed.configureTestingModule({ providers: deps.providers });
  const store = TestBed.inject(PopupStore);
  await store.init();
  await store.setMode(SAVE_MODE.Tabs);
  return { store, ...deps };
}

describe('PopupStore: All tabs', () => {
  beforeEach(() => localStorage.clear());

  it('saves the ticked tabs in one batch request with the shared folder and tags', async () => {
    const { store, api } = await setup();
    store.chooseFolder('f1');
    store.chosenTags.set(['read']);
    store.tabList.toggle(at(store.tabList.entries(), 2).key);
    await store.save();
    expect(api.createBatch).toHaveBeenCalledTimes(1);
    expect(api.create).not.toHaveBeenCalled();
    const body = at(api.createBatch.mock.calls, 0)[0];
    expect(body.items.map((item) => item.url)).toEqual(['https://a.test/1', 'https://b.test/2']);
    expect(body.items.map((item) => item.title)).toEqual(['One', 'Two']);
    expect(body.items[0]?.faviconUrl).toBe('https://a.test/i.png');
    expect(body).toMatchObject({ folderId: 'f1', tags: ['read'] });
    expect(body).not.toHaveProperty('note');
    expect(store.view()).toBe('savedTabs');
  });

  it('sends the same idempotency keys when a failed batch is retried', async () => {
    const { store, api } = await setup();
    api.createBatch.mockRejectedValueOnce(new HttpErrorResponse({ status: 500 }));
    await store.save();
    expect(store.view()).toBe('error');
    expect(store.failure()?.retryable).toBe(true);
    await store.retry();
    const [first, second] = api.createBatch.mock.calls.map(([body]) =>
      body.items.map((item) => item.idempotencyKey),
    );
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(3);
    expect(store.view()).toBe('savedTabs');
  });

  it('does not save with nothing ticked', async () => {
    const { store, api } = await setup();
    store.tabList.toggleAll();
    await store.save();
    expect(api.createBatch).not.toHaveBeenCalled();
  });

  it('sends each sorted tab its own folder, AI tags merged with Tags for all, and its draft id', async () => {
    const { store, api } = await setup({ ai: makeAiSettings({ settings: { enabled: true } }) });
    api.createAiDraft.mockResolvedValueOnce(
      makeAiJob({
        suggestions: [
          suggestion('s0', SUGGESTION_KIND.Folder, { folderId: 'f2' }),
          suggestion('s1', SUGGESTION_KIND.Tag, { tagName: 'signals' }),
        ],
      }),
    );
    api.createAiDraft.mockResolvedValue(makeAiJob());
    await store.tabsAi.sort();
    store.chosenTags.set(['all']);
    await store.save();
    const body = at(api.createBatch.mock.calls, 0)[0];
    const draftIds = api.createAiDraft.mock.calls.map(([draft]) => draft.draftId);
    expect(body.items[0]).toMatchObject({
      folderId: 'f2',
      tags: ['signals', 'all'],
      aiDraftId: draftIds[0],
    });
    expect(body.items[1]).toMatchObject({ aiDraftId: draftIds[1] });
    expect(body.items[1]).not.toHaveProperty('folderId');
    expect(body.tags).toEqual(['all']);
    expect(body.applyRules).toBe(true);
  });

  it('names the skipped tabs and reads the saved ones from the answer', async () => {
    const { store } = await setup({
      batch: {
        links: [makeLink({ folderId: 'f1' }), makeLink({ folderId: 'f1' })],
        errors: [{ index: 1, url: 'https://b.test/2', code: LINK_BATCH_ERROR_CODE.UrlTooLong }],
      },
    });
    await store.save();
    const result = store.savedTabs();
    expect(result?.saved.map((entry) => entry.tabId)).toEqual([11, 13]);
    expect(result?.skipped.map((item) => item.entry.tabId)).toEqual([12]);
    expect(result?.folderIds).toEqual(['f1']);
  });

  it('remembers the folder as recent only when all links went to one', async () => {
    const { store } = await setup();
    await store.save();
    expect(localStorage.getItem('sm-ext-recent-folders')).toContain('f1');
  });

  it('closes exactly the saved tabs, only on the click', async () => {
    const { store, tabs } = await setup({
      batch: {
        links: [makeLink(), makeLink()],
        errors: [{ index: 0, url: 'https://a.test/1', code: LINK_BATCH_ERROR_CODE.UrlTooLong }],
      },
    });
    await store.save();
    expect(tabs.closeTabs).not.toHaveBeenCalled();
    await store.closeSavedTabs();
    expect(tabs.closeTabs).toHaveBeenCalledWith([12, 13]);
    expect(store.tabsClosed()).toBe(true);
  });

  it('keeps the button and does not claim the tabs closed when closing fails', async () => {
    const { store, tabs } = await setup();
    await store.save();
    tabs.closeTabs.mockRejectedValueOnce(new Error('no'));
    await store.closeSavedTabs();
    expect(store.tabsClosed()).toBe(false);
    await store.closeSavedTabs();
    expect(store.tabsClosed()).toBe(true);
  });

  it('opens the folder page of the saved links, or the library when they went to several folders', async () => {
    const one = await setup();
    await one.store.save();
    await one.store.openSavedTabsFolder();
    expect(one.tabs.open).toHaveBeenCalledWith(`${SHELFMARK_ORIGIN}/folders/f1`);
  });

  it('opens the library when AI spread the links over folders', async () => {
    const { store, tabs } = await setup({
      batch: {
        links: [makeLink({ folderId: 'f1' }), makeLink({ folderId: 'f2' })],
        errors: [],
      },
    });
    await store.save();
    await store.openSavedTabsFolder();
    expect(tabs.open).toHaveBeenCalledWith(`${SHELFMARK_ORIGIN}/links`);
  });

  it('keeps the single save for This page', async () => {
    const { store, api } = await setup();
    await store.setMode(SAVE_MODE.Page);
    await store.save();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.createBatch).not.toHaveBeenCalled();
  });
});
