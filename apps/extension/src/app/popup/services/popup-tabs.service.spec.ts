import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { fakeData, fakePopupDeps, type FakeData } from '../../../testing/fake-popup-deps';
import { makeLink, makeWindowTab } from '../../../testing/fixtures';
import { SAVE_MODE } from '../models/save-mode.const';
import { TABS_LOOKUP_MAX } from '../models/tabs-lookup-max.const';
import { PopupStore } from '../popup.store';
import { at } from '../../../testing/at';

const WINDOW = [
  makeWindowTab(1, 'https://a.test/1', { active: true }),
  makeWindowTab(2, 'https://b.test/'),
  makeWindowTab(3, 'chrome://extensions'),
  makeWindowTab(4, 'https://b.test/#frag'),
  makeWindowTab(5, 'https://c.test/'),
];

async function setup(overrides: Partial<FakeData> = {}) {
  const deps = fakePopupDeps(fakeData({ windowTabs: WINDOW, tabsPermission: true, ...overrides }));
  TestBed.configureTestingModule({ providers: deps.providers });
  const store = TestBed.inject(PopupStore);
  await store.init();
  return { store, list: store.tabList, ...deps };
}

describe('PopupTabsService', () => {
  beforeEach(() => localStorage.clear());

  describe('the switch', () => {
    it('counts the savable tabs once the permission is granted', async () => {
      const { list } = await setup();
      expect(list.windowCount()).toBe(3);
      expect(list.switchShown()).toBe(true);
    });

    it('counts all tabs of the window without the permission (no addresses then)', async () => {
      const { list } = await setup({
        tabsPermission: false,
        windowTabs: WINDOW.map((tab) => ({ ...tab, url: null })),
      });
      expect(list.windowCount()).toBe(5);
      expect(list.switchShown()).toBe(true);
    });

    it('is hidden for a window with one tab', async () => {
      const { list } = await setup({ windowTabs: [at(WINDOW, 0)] });
      expect(list.switchShown()).toBe(false);
    });

    it('is hidden when the tabs cannot be read', async () => {
      const deps = fakePopupDeps(fakeData());
      deps.tabs.windowTabs.mockRejectedValue(new Error('no'));
      TestBed.configureTestingModule({ providers: deps.providers });
      const store = TestBed.inject(PopupStore);
      await store.init();
      expect(store.tabList.switchShown()).toBe(false);
      expect(store.view()).toBe('form');
    });

    it('starts on This page', async () => {
      const { list } = await setup();
      expect(list.mode()).toBe(SAVE_MODE.Page);
      expect(list.active()).toBe(false);
    });
  });

  describe('the permission', () => {
    it('asks Chrome on the first switch to All tabs, and stays on This page when declined', async () => {
      const { list, tabs, api } = await setup({
        tabsPermission: false,
        tabsPermissionAnswer: false,
        windowTabs: WINDOW.map((tab) => ({ ...tab, url: null })),
      });
      await list.setMode(SAVE_MODE.Tabs);
      expect(tabs.requestTabsPermission).toHaveBeenCalledTimes(1);
      expect(list.mode()).toBe(SAVE_MODE.Page);
      expect(list.entries()).toEqual([]);
      expect(api.lookup).toHaveBeenCalledTimes(1); // only the open tab's duplicate check
    });

    it('lists the tabs after a grant, asking only once', async () => {
      const { list, tabs } = await setup({ tabsPermission: false });
      await list.setMode(SAVE_MODE.Tabs);
      await list.setMode(SAVE_MODE.Page);
      await list.setMode(SAVE_MODE.Tabs);
      expect(tabs.requestTabsPermission).toHaveBeenCalledTimes(1);
      expect(list.entries()).toHaveLength(3);
    });

    it('does not ask when the permission is granted already', async () => {
      const { list, tabs } = await setup();
      await list.setMode(SAVE_MODE.Tabs);
      expect(tabs.requestTabsPermission).not.toHaveBeenCalled();
    });

    it('goes back to This page when fewer than two savable tabs are left', async () => {
      const { list } = await setup({
        tabsPermission: false,
        windowTabs: [at(WINDOW, 0), at(WINDOW, 2)],
      });
      await list.setMode(SAVE_MODE.Tabs);
      expect(list.mode()).toBe(SAVE_MODE.Page);
      expect(list.switchShown()).toBe(false);
    });
  });

  describe('the list', () => {
    it('leaves out browser pages and repeated addresses, the open tab first', async () => {
      const { list } = await setup();
      await list.setMode(SAVE_MODE.Tabs);
      expect(list.entries().map((entry) => entry.tabId)).toEqual([1, 2, 5]);
    });

    it('ticks every tab but the ones already in the library, which carry the Saved mark', async () => {
      const { list, api } = await setup();
      api.lookup.mockImplementation((body) =>
        Promise.resolve({ link: body.url === 'https://b.test/' ? makeLink() : null }),
      );
      await list.setMode(SAVE_MODE.Tabs);
      expect(
        list
          .entries()
          .filter((entry) => entry.saved)
          .map((entry) => entry.tabId),
      ).toEqual([2]);
      expect(list.selected().map((entry) => entry.tabId)).toEqual([1, 5]);
      expect(list.savedCount()).toBe(1);
      expect(list.someTicked()).toBe(true);
      expect(list.allTicked()).toBe(false);
    });

    it('asks the library without the fragment', async () => {
      const { list, api } = await setup();
      await list.setMode(SAVE_MODE.Tabs);
      const urls = api.lookup.mock.calls.map(([body]) => body.url);
      expect(urls).toContain('https://b.test/');
      expect(urls.some((url) => url.includes('#'))).toBe(false);
    });

    it('stops the checks after a failure (a rate limit) and still lists every tab', async () => {
      const many = Array.from({ length: 10 }, (_, i) =>
        makeWindowTab(i + 1, `https://a.test/${i}`),
      );
      const { list, api } = await setup({ windowTabs: many });
      api.lookup.mockClear();
      api.lookup.mockRejectedValue(new HttpErrorResponse({ status: 429 }));
      await list.setMode(SAVE_MODE.Tabs);
      expect(list.entries()).toHaveLength(10);
      expect(list.selectedCount()).toBe(10);
      expect(api.lookup.mock.calls.length).toBeLessThan(10);
    });

    it('checks at most TABS_LOOKUP_MAX tabs', async () => {
      const many = Array.from({ length: 60 }, (_, i) =>
        makeWindowTab(i + 1, `https://a.test/${i}`),
      );
      const { list, api } = await setup({ windowTabs: many });
      api.lookup.mockClear();
      await list.setMode(SAVE_MODE.Tabs);
      expect(api.lookup).toHaveBeenCalledTimes(TABS_LOOKUP_MAX);
      expect(list.entries()).toHaveLength(60);
    });

    it('ends in the signed-out screen when the library check answers 401', async () => {
      const { store, api } = await setup();
      api.lookup.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
      await store.setMode(SAVE_MODE.Tabs);
      expect(store.view()).toBe('signedOut');
      expect(store.tabList.mode()).toBe(SAVE_MODE.Page);
    });
  });

  describe('the switch while busy', () => {
    it('ignores a second click while the first is still working (one prompt, one list, same keys)', async () => {
      const { list, tabs, api } = await setup({ tabsPermission: false });
      api.lookup.mockClear();
      const first = list.setMode(SAVE_MODE.Tabs);
      const second = list.setMode(SAVE_MODE.Tabs);
      expect(list.switching()).toBe(true);
      await Promise.all([first, second]);
      expect(tabs.requestTabsPermission).toHaveBeenCalledTimes(1);
      expect(api.lookup).toHaveBeenCalledTimes(3);
      expect(list.entries()).toHaveLength(3);
      expect(list.switching()).toBe(false);
      const keys = list.entries().map((entry) => entry.idempotencyKey);
      await list.setMode(SAVE_MODE.Page);
      await list.setMode(SAVE_MODE.Tabs);
      expect(list.entries().map((entry) => entry.idempotencyKey)).toEqual(keys);
    });
  });

  describe('the ticks', () => {
    it('toggles one tab and Select all ticks everything, then nothing', async () => {
      const { list } = await setup();
      await list.setMode(SAVE_MODE.Tabs);
      expect(list.allTicked()).toBe(true);
      list.toggle(at(list.entries(), 0).key);
      expect(list.selectedCount()).toBe(2);
      expect(list.someTicked()).toBe(true);
      list.toggleAll();
      expect(list.allTicked()).toBe(true);
      list.toggleAll();
      expect(list.selectedCount()).toBe(0);
      expect(list.someTicked()).toBe(false);
    });
  });
});
