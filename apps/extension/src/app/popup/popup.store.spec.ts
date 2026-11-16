import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LINK_ERROR_MESSAGE, LINK_LIMIT } from '@shelfmark/contracts';
import { fakeData, fakePopupDeps, type FakeData } from '../../testing/fake-popup-deps';
import { makeFolder, makeLink, makeRule } from '../../testing/fixtures';
import { SHELFMARK_ORIGIN } from '../core/config/shelfmark-origin.const';
import { OPENING_DELAY_MS } from './models/opening-delay-ms.const';
import { POPUP_ERROR } from './models/popup-error.const';
import { POPUP_STEP } from './models/popup-step.const';
import { POPUP_VIEW } from './models/popup-view.const';
import { PopupStore } from './popup.store';

function setup(overrides: Partial<FakeData> = {}) {
  const deps = fakePopupDeps(fakeData(overrides));
  TestBed.configureTestingModule({ providers: deps.providers });
  return { store: TestBed.inject(PopupStore), ...deps };
}

const http = (status: number, message?: string): HttpErrorResponse =>
  new HttpErrorResponse({ status, error: message === undefined ? null : { message } });

describe('PopupStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  describe('init', () => {
    it('shows the unsupported screen for a browser page and asks the API nothing', async () => {
      const { store, api } = setup({ tab: { url: 'chrome://extensions', title: 'x' } });
      await store.init();
      expect(store.view()).toBe(POPUP_VIEW.Unsupported);
      expect(api.session).not.toHaveBeenCalled();
    });

    it('shows the unsupported screen when there is no tab', async () => {
      const { store } = setup({ tab: null });
      await store.init();
      expect(store.view()).toBe(POPUP_VIEW.Unsupported);
      expect(store.page()).toBeNull();
    });

    it('shows the signed-out screen when there is no session', async () => {
      const { store, api } = setup({ session: null });
      await store.init();
      expect(store.view()).toBe(POPUP_VIEW.SignedOut);
      expect(api.lookup).not.toHaveBeenCalled();
    });

    it.each(['session', 'folders', 'tags', 'rules', 'lookup'] as const)(
      'shows the signed-out screen when %s answers 401',
      async (call) => {
        const { store, api } = setup();
        api[call].mockRejectedValue(http(401));
        await store.init();
        expect(store.view()).toBe(POPUP_VIEW.SignedOut);
        expect(store.failure()).toBeNull();
      },
    );

    it('shows the empty form with the page when nothing matches', async () => {
      const { store, api } = setup();
      await store.init();
      expect(store.view()).toBe(POPUP_VIEW.Form);
      expect(store.page()).toEqual({
        url: 'https://www.example.com/post',
        title: 'A post',
        host: 'example.com',
      });
      expect(api.lookup).toHaveBeenCalledWith({ url: 'https://www.example.com/post' });
      expect(store.folderId()).toBeNull();
      expect(store.chosenTags()).toEqual([]);
      expect(store.ruleHint()).toBeNull();
    });

    it('prefills folder and tags from the matching domain rule', async () => {
      const { store } = setup({
        folders: [makeFolder({ id: 'f1', name: 'Reading' })],
        rules: [makeRule({ domain: 'example.com', folderId: 'f1', tags: ['docs', 'ref'] })],
      });
      await store.init();
      expect(store.folderId()).toBe('f1');
      expect(store.folder()?.name).toBe('Reading');
      expect(store.chosenTags()).toEqual(['docs', 'ref']);
      expect(store.ruleHint()).toBe('example.com');
    });

    it('takes only the rule tags when its folder is not available', async () => {
      const { store } = setup({
        rules: [makeRule({ folderId: 'f1', folderAvailable: false, tags: ['docs'] })],
      });
      await store.init();
      expect(store.folderId()).toBeNull();
      expect(store.chosenTags()).toEqual(['docs']);
      expect(store.ruleHint()).toBeNull();
    });

    it('ignores a rule of another domain', async () => {
      const { store } = setup({ rules: [makeRule({ domain: 'other.com', tags: ['x'] })] });
      await store.init();
      expect(store.chosenTags()).toEqual([]);
    });

    it('shows the already-saved screen for a duplicate', async () => {
      const link = makeLink({ folderId: 'f1' });
      const { store } = setup({
        folders: [makeFolder({ id: 'f1', name: 'Reading' })],
        lookup: { link },
      });
      await store.init();
      expect(store.view()).toBe(POPUP_VIEW.Duplicate);
      expect(store.link()).toEqual(link);
      expect(store.linkFolder()?.name).toBe('Reading');
    });

    it('shows a retryable load error, and retry() loads again', async () => {
      const { store, api } = setup();
      api.folders.mockRejectedValueOnce(http(500));
      await store.init();
      expect(store.view()).toBe(POPUP_VIEW.Error);
      expect(store.failure()).toEqual({
        error: POPUP_ERROR.Server,
        step: POPUP_STEP.Load,
        retryable: true,
      });

      await store.retry();
      expect(store.view()).toBe(POPUP_VIEW.Form);
      expect(api.session).toHaveBeenCalledTimes(2);
    });

    it('shows the offline error when the network is down', async () => {
      const { store, api } = setup();
      api.session.mockRejectedValue(http(0));
      await store.init();
      expect(store.failure()?.error).toBe(POPUP_ERROR.Offline);
    });
  });

  describe('retry', () => {
    it('does nothing without a failure', async () => {
      const { store, api } = setup();
      await store.retry();
      expect(api.session).not.toHaveBeenCalled();
      expect(store.view()).toBe(POPUP_VIEW.Opening);
    });
  });

  describe('save', () => {
    it('does nothing without a page', async () => {
      const { store, api } = setup({ tab: null });
      await store.init();
      await store.save();
      expect(api.create).not.toHaveBeenCalled();
    });

    it('sends url, title, empty tags and applyRules false, and leaves out folder and note', async () => {
      const { store, api } = setup();
      await store.init();
      await store.save();
      const body = api.create.mock.calls[0]?.[0];
      expect(body).toMatchObject({
        url: 'https://www.example.com/post',
        title: 'A post',
        tags: [],
        applyRules: false,
      });
      expect(body).not.toHaveProperty('folderId');
      expect(body).not.toHaveProperty('note');
      expect(typeof body?.idempotencyKey).toBe('string');
    });

    it('sends the chosen folder, tags and a trimmed note', async () => {
      const { store, api } = setup({ folders: [makeFolder({ id: 'f1' })] });
      await store.init();
      store.chooseFolder('f1');
      store.chosenTags.set(['a', 'b']);
      store.note.set('  remember this  ');
      await store.save();
      expect(api.create.mock.calls[0]?.[0]).toMatchObject({
        folderId: 'f1',
        tags: ['a', 'b'],
        note: 'remember this',
        applyRules: false,
      });
    });

    it('leaves out a note that is only whitespace', async () => {
      const { store, api } = setup();
      await store.init();
      store.note.set('   ');
      await store.save();
      expect(api.create.mock.calls[0]?.[0]).not.toHaveProperty('note');
    });

    it('truncates the title to the title limit', async () => {
      const { store, api } = setup({
        tab: { url: 'https://example.com/', title: 'x'.repeat(LINK_LIMIT.TitleMax + 50) },
      });
      await store.init();
      await store.save();
      expect(api.create.mock.calls[0]?.[0].title).toHaveLength(LINK_LIMIT.TitleMax);
    });

    it('shows Saved with the created link and remembers its folder', async () => {
      const created = makeLink({ folderId: 'f1' });
      const { store } = setup({ folders: [makeFolder({ id: 'f1', name: 'Reading' })], created });
      await store.init();
      await store.save();
      expect(store.view()).toBe(POPUP_VIEW.Saved);
      expect(store.link()).toEqual(created);
      expect(store.linkFolder()?.name).toBe('Reading');
      expect(store.recentFolders().map((r) => r.id)).toEqual(['f1']);
      expect(store.saving()).toBe(false);
    });

    it('ignores a second save while one is running', async () => {
      const { store, api } = setup();
      await store.init();
      const first = store.save();
      const second = store.save();
      await Promise.all([first, second]);
      expect(api.create).toHaveBeenCalledTimes(1);
    });

    it('keeps the same idempotency key when a failed save is retried', async () => {
      const { store, api } = setup();
      api.create.mockRejectedValueOnce(http(500));
      await store.init();
      await store.save();
      expect(store.view()).toBe(POPUP_VIEW.Error);
      expect(store.failure()).toEqual({
        error: POPUP_ERROR.Server,
        step: POPUP_STEP.Save,
        retryable: true,
      });

      await store.retry();
      expect(store.view()).toBe(POPUP_VIEW.Saved);
      const keys = api.create.mock.calls.map(([body]) => body.idempotencyKey);
      expect(keys).toHaveLength(2);
      expect(keys[0]).toBe(keys[1]);
    });

    it('uses a new idempotency key after saveCopy()', async () => {
      const link = makeLink();
      const { store, api } = setup({ lookup: { link } });
      await store.init();
      store.saveCopy();
      expect(store.view()).toBe(POPUP_VIEW.Form);
      await store.save();
      store.saveCopy();
      await store.save();
      const [first, second] = api.create.mock.calls.map(([body]) => body.idempotencyKey);
      expect(first).not.toBe(second);
    });

    it('treats a full library as not retryable', async () => {
      const { store, api } = setup();
      api.create.mockRejectedValue(http(403, LINK_ERROR_MESSAGE.LimitReached));
      await store.init();
      await store.save();
      expect(store.failure()).toEqual({
        error: POPUP_ERROR.Limit,
        step: POPUP_STEP.Save,
        retryable: false,
      });
    });

    it('shows the signed-out screen when saving answers 401', async () => {
      const { store, api } = setup();
      api.create.mockRejectedValue(http(401));
      await store.init();
      await store.save();
      expect(store.view()).toBe(POPUP_VIEW.SignedOut);
    });
  });

  describe('form state', () => {
    it('drops the rule hint when the folder changes', async () => {
      const { store } = setup({
        folders: [makeFolder({ id: 'f1' }), makeFolder({ id: 'f2' })],
        rules: [makeRule({ folderId: 'f1' })],
      });
      await store.init();
      expect(store.ruleHint()).toBe('example.com');
      store.chooseFolder('f2');
      expect(store.ruleHint()).toBeNull();
      store.chooseFolder('f1');
      expect(store.ruleHint()).toBe('example.com');
    });

    it('chooses a folder and goes back to the form from the picker', async () => {
      const { store } = setup({ folders: [makeFolder({ id: 'f1' })] });
      await store.init();
      store.openPicker();
      expect(store.view()).toBe(POPUP_VIEW.Picker);
      store.chooseFolder('f1');
      expect(store.view()).toBe(POPUP_VIEW.Form);
      expect(store.folderId()).toBe('f1');
      store.openPicker();
      store.closePicker();
      expect(store.view()).toBe(POPUP_VIEW.Form);
    });

    it('lists recent folders and drops the ones that no longer exist', async () => {
      localStorage.setItem('sm-ext-recent-folders', JSON.stringify(['gone', null, 'f1']));
      const { store } = setup({ folders: [makeFolder({ id: 'f1', name: 'Reading' })] });
      await store.init();
      expect(store.recentFolders()).toEqual([
        { id: null, folder: null },
        { id: 'f1', folder: expect.objectContaining({ name: 'Reading' }) },
      ]);
    });
  });

  describe('opening pages', () => {
    it('opens the app, sign-in and privacy pages on the Shelfmark origin', async () => {
      const { store, tabs } = setup();
      await store.openApp();
      await store.openSignIn();
      await store.openPrivacy();
      expect(tabs.open.mock.calls.map(([url]) => url)).toEqual([
        `${SHELFMARK_ORIGIN}/links`,
        `${SHELFMARK_ORIGIN}/sign-in`,
        `${SHELFMARK_ORIGIN}/privacy`,
      ]);
    });

    it('opens the folder page of the saved link', async () => {
      const { store, tabs } = setup({
        created: makeLink({ folderId: 'a/b' }),
        folders: [makeFolder({ id: 'a/b' })],
      });
      await store.init();
      await store.save();
      await store.openLinkFolder();
      expect(tabs.open).toHaveBeenCalledWith(`${SHELFMARK_ORIGIN}/folders/a%2Fb`);
    });

    it('opens Unsorted for a link without a folder', async () => {
      const { store, tabs } = setup({ lookup: { link: makeLink({ folderId: null }) } });
      await store.init();
      await store.openLinkFolder();
      expect(tabs.open).toHaveBeenCalledWith(`${SHELFMARK_ORIGIN}/unsorted`);
    });

    it('closes the popup', () => {
      const { store, tabs } = setup();
      store.close();
      expect(tabs.close).toHaveBeenCalled();
    });
  });

  describe('slow loading', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('sets the slow flag only after OPENING_DELAY_MS', async () => {
      const { store, api } = setup();
      let release: () => void = () => undefined;
      api.session.mockReturnValue(
        new Promise((resolve) => {
          release = () => resolve(fakeData().session);
        }),
      );
      const loading = store.init();
      await vi.advanceTimersByTimeAsync(OPENING_DELAY_MS - 1);
      expect(store.slow()).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(store.slow()).toBe(true);
      release();
      await loading;
      expect(store.view()).toBe(POPUP_VIEW.Form);
    });

    it('never sets the slow flag when loading is fast', async () => {
      const { store } = setup();
      await store.init();
      await vi.advanceTimersByTimeAsync(OPENING_DELAY_MS * 2);
      expect(store.slow()).toBe(false);
    });
  });
});
