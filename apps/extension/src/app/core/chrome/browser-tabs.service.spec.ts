import { TestBed } from '@angular/core/testing';
import { BrowserTabsService } from './browser-tabs.service';

function withChrome(chrome: unknown): BrowserTabsService {
  Reflect.set(globalThis, 'chrome', chrome);
  TestBed.configureTestingModule({});
  return TestBed.inject(BrowserTabsService);
}

function tabsApi(
  tabs: { id?: number; active?: boolean; url?: string; title?: string; favIconUrl?: string }[],
) {
  return {
    query: vi.fn(() => Promise.resolve(tabs)),
    create: vi.fn(() => Promise.resolve({})),
    remove: vi.fn(() => Promise.resolve()),
  };
}

describe('BrowserTabsService', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'close').mockImplementation(() => undefined);
  });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'chrome');
    vi.restoreAllMocks();
  });

  describe('outside an extension', () => {
    it('has no active tab', async () => {
      expect(await withChrome(undefined).active()).toBeNull();
    });

    it('opens the page with window.open and closes the popup', async () => {
      const open = vi.spyOn(globalThis, 'open').mockImplementation(() => null);
      await withChrome({}).open('https://x.test/');
      expect(open).toHaveBeenCalledWith('https://x.test/', '_blank', 'noopener');
      expect(globalThis.close).toHaveBeenCalled();
    });

    it('has no window tabs and no permission', async () => {
      const service = withChrome(undefined);
      expect(await service.windowTabs()).toEqual([]);
      expect(await service.hasTabsPermission()).toBe(false);
      expect(await service.requestTabsPermission()).toBe(false);
    });

    it('ignores a chrome object without the full tabs api', async () => {
      expect(await withChrome({ tabs: { query: () => [] } }).active()).toBeNull();
    });
  });

  describe('inside an extension', () => {
    it('reads the url and title of the active tab only', async () => {
      const tabs = tabsApi([{ url: 'https://a.test/', title: 'A' }]);
      expect(await withChrome({ tabs }).active()).toEqual({ url: 'https://a.test/', title: 'A' });
      expect(tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    });

    it('uses an empty title when the tab has none', async () => {
      expect(await withChrome({ tabs: tabsApi([{ url: 'https://a.test/' }]) }).active()).toEqual({
        url: 'https://a.test/',
        title: '',
      });
    });

    it('answers null when the tab has no url', async () => {
      expect(await withChrome({ tabs: tabsApi([{ title: 'x' }]) }).active()).toBeNull();
    });

    it('answers null when there is no tab', async () => {
      expect(await withChrome({ tabs: tabsApi([]) }).active()).toBeNull();
    });

    it('creates a tab and closes the popup', async () => {
      const tabs = tabsApi([]);
      await withChrome({ tabs }).open('https://x.test/');
      expect(tabs.create).toHaveBeenCalledWith({ url: 'https://x.test/' });
      expect(globalThis.close).toHaveBeenCalled();
    });

    it('lists the tabs of the current window, with no url when the permission is missing', async () => {
      const tabs = tabsApi([
        { id: 1, active: true, url: 'https://a.test/', title: 'A', favIconUrl: 'https://a.test/i' },
        { id: 2 },
        {},
      ]);
      expect(await withChrome({ tabs }).windowTabs()).toEqual([
        { id: 1, active: true, url: 'https://a.test/', title: 'A', favIconUrl: 'https://a.test/i' },
        { id: 2, active: false, url: null, title: '', favIconUrl: null },
      ]);
      expect(tabs.query).toHaveBeenCalledWith({ currentWindow: true });
    });

    it('closes the given tabs, and none for an empty list', async () => {
      const tabs = tabsApi([]);
      const service = withChrome({ tabs });
      await service.closeTabs([4, 5]);
      await service.closeTabs([]);
      expect(tabs.remove).toHaveBeenCalledTimes(1);
      expect(tabs.remove).toHaveBeenCalledWith([4, 5]);
    });

    it('asks for the optional tabs permission and reads whether it is granted', async () => {
      const permissions = {
        contains: vi.fn(() => Promise.resolve(true)),
        request: vi.fn(() => Promise.resolve(false)),
      };
      const service = withChrome({ tabs: tabsApi([]), permissions });
      expect(await service.hasTabsPermission()).toBe(true);
      expect(await service.requestTabsPermission()).toBe(false);
      expect(permissions.request).toHaveBeenCalledWith({ permissions: ['tabs'] });
    });

    it('closes the popup', () => {
      withChrome({ tabs: tabsApi([]) }).close();
      expect(globalThis.close).toHaveBeenCalled();
    });
  });
});
