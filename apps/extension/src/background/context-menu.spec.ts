import { LINK_ERROR_MESSAGE } from '@shelfmark/contracts';
import type { Mock } from 'vitest';
import { createMenu, handleClick, registerContextMenu, showResult } from './context-menu';
import { BADGE } from './models/badge.const';
import type { ContextMenuClick } from './models/context-menu-click.interface';
import type { ContextMenuTab } from './models/context-menu-tab.interface';
import { HTTP_URL_PATTERNS } from './models/http-url-patterns.const';
import { MENU_ID } from './models/menu-id.const';
import { SAVE_OUTCOME } from './models/save-outcome.const';

const ORIGIN = 'http://localhost:4200';
const SESSION = { user: { id: 'u1', name: 'Ann', email: 'ann@example.com' } };
const FOLDERS = { items: [{ id: 'f-shop', name: 'Shopping' }] };
const link = (folderId: string | null) => ({ id: 'l1', url: 'https://example.com/', folderId });

interface FakeChrome {
  runtime: { onInstalled: { addListener: Mock } };
  contextMenus: { create: Mock; removeAll: Mock; onClicked: { addListener: Mock } };
  action: {
    setBadgeText: Mock;
    setBadgeBackgroundColor: Mock;
    setBadgeTextColor: Mock;
    setTitle: Mock;
    openPopup?: Mock;
  };
  i18n: { getMessage: Mock };
  tabs: { create: Mock };
}

function fakeChrome(): FakeChrome {
  return {
    runtime: { onInstalled: { addListener: vi.fn() } },
    contextMenus: {
      create: vi.fn(),
      removeAll: vi.fn().mockResolvedValue(undefined),
      onClicked: { addListener: vi.fn() },
    },
    action: {
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      setBadgeTextColor: vi.fn().mockResolvedValue(undefined),
      setTitle: vi.fn().mockResolvedValue(undefined),
      openPopup: vi.fn().mockResolvedValue(undefined),
    },
    // "key" or "key:substitution", so the specs can see which text was picked.
    i18n: {
      getMessage: vi.fn((key: string, sub?: string) => (sub === undefined ? key : `${key}:${sub}`)),
    },
    tabs: { create: vi.fn().mockResolvedValue(undefined) },
  };
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

type Route = (body: unknown) => Response;

/** A fake Shelfmark API keyed by "METHOD /path"; any other route answers 500. */
function api(routes: Record<string, Route>): Mock {
  return vi.fn((input: string, init: RequestInit) => {
    const path = input.replace(ORIGIN, '');
    const route = routes[`${init.method ?? 'GET'} ${path}`];
    const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    return Promise.resolve(route === undefined ? json(500, {}) : route(body));
  });
}

const signedIn = (extra: Record<string, Route> = {}): Record<string, Route> => ({
  'GET /api/auth/get-session': () => json(200, SESSION),
  'GET /api/folders': () => json(200, FOLDERS),
  'POST /api/links/lookup': () => json(200, { link: null }),
  'POST /api/links': () => json(201, link('f-shop')),
  ...extra,
});

const LINK_CLICK: ContextMenuClick = {
  menuItemId: MENU_ID.SaveLink,
  linkUrl: 'https://example.com/ramen#top',
  pageUrl: 'https://blog.example.org/weekend',
};
const PAGE_CLICK: ContextMenuClick = {
  menuItemId: MENU_ID.SavePage,
  pageUrl: 'https://blog.example.org/weekend',
};
const TAB: ContextMenuTab = { id: 7, title: '  Weekend reading  ' };

let chrome: FakeChrome;
let fetchMock: Mock;

function bodyOf(method: string, path: string): unknown {
  const calls = fetchMock.mock.calls as [string, RequestInit][];
  const init = calls.find(
    ([input, options]) => input === `${ORIGIN}${path}` && (options.method ?? 'GET') === method,
  )?.[1];
  return typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
}

beforeEach(() => {
  chrome = fakeChrome();
  vi.stubGlobal('chrome', chrome);
  fetchMock = api(signedIn());
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('menu creation', () => {
  it('registers the install and click listeners when the worker starts', () => {
    registerContextMenu();
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
    expect(chrome.contextMenus.onClicked.addListener).toHaveBeenCalledTimes(1);
  });

  it('creates both items on install, after clearing the old ones (an update installs again)', async () => {
    registerContextMenu();
    const onInstalled = chrome.runtime.onInstalled.addListener.mock.calls[0]?.[0] as () => void;
    onInstalled();
    await vi.waitFor(() => expect(chrome.contextMenus.create).toHaveBeenCalledTimes(2));
    expect(chrome.contextMenus.removeAll).toHaveBeenCalledBefore(chrome.contextMenus.create);
  });

  it('shows "Save link" on http(s) links and "Save page" on http(s) pages, in the browser language', async () => {
    await createMenu();
    expect(chrome.contextMenus.create).toHaveBeenCalledWith({
      id: MENU_ID.SaveLink,
      title: 'menuSaveLink',
      contexts: ['link'],
      targetUrlPatterns: HTTP_URL_PATTERNS,
    });
    expect(chrome.contextMenus.create).toHaveBeenCalledWith({
      id: MENU_ID.SavePage,
      title: 'menuSavePage',
      contexts: ['page'],
      documentUrlPatterns: HTTP_URL_PATTERNS,
    });
  });

  it('passes a click from the listener on to the save', async () => {
    registerContextMenu();
    const onClicked = chrome.contextMenus.onClicked.addListener.mock.calls[0]?.[0] as (
      info: ContextMenuClick,
      tab?: ContextMenuTab,
    ) => void;
    onClicked(LINK_CLICK, TAB);
    await vi.waitFor(() =>
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'savedTo:Shopping' }),
    );
  });
});

describe('Save link to Shelfmark', () => {
  it('saves the link address with the session cookie, no title, and the server applying the rules', async () => {
    await handleClick(LINK_CLICK, TAB);

    for (const [input, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(input.startsWith(`${ORIGIN}/api/`)).toBe(true);
      expect(init.credentials).toBe('include');
    }
    // The duplicate check, like the popup's: without the #fragment.
    expect(bodyOf('POST', '/api/links/lookup')).toEqual({ url: 'https://example.com/ramen' });
    const created = bodyOf('POST', '/api/links') as Record<string, unknown>;
    expect(created['url']).toBe('https://example.com/ramen#top');
    expect(created).not.toHaveProperty('title');
    expect(created).not.toHaveProperty('folderId');
    expect(created).not.toHaveProperty('applyRules');
    expect(created['idempotencyKey']).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it('shows a ✓ badge and "Saved to <folder>" on that tab, then clears both', async () => {
    vi.useFakeTimers();
    await handleClick(LINK_CLICK, TAB);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: BADGE.SuccessText });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      tabId: 7,
      color: BADGE.SuccessColor,
    });
    expect(chrome.action.setBadgeTextColor).toHaveBeenCalledWith({
      tabId: 7,
      color: BADGE.TextColor,
    });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'savedTo:Shopping' });

    await vi.advanceTimersByTimeAsync(BADGE.ClearMs);
    expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 7, text: '' });
    expect(chrome.action.setTitle).toHaveBeenLastCalledWith({ tabId: 7, title: 'actionTitle' });
    expect(chrome.action.openPopup).not.toHaveBeenCalled();
  });

  it('names Unsorted when no rule filed the link', async () => {
    fetchMock = api(signedIn({ 'POST /api/links': () => json(201, link(null)) }));
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(LINK_CLICK, TAB);
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'savedTo:unsorted' });
  });

  it('does not save an address that is saved already and says where it is', async () => {
    fetchMock = api(
      signedIn({ 'POST /api/links/lookup': () => json(200, { link: link('f-shop') }) }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(LINK_CLICK, TAB);

    expect(bodyOf('POST', '/api/links')).toBeUndefined();
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: BADGE.SuccessText });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({
      tabId: 7,
      title: 'alreadySavedIn:Shopping',
    });
  });

  it('still saves when the duplicate check fails with anything but a 401', async () => {
    fetchMock = api(signedIn({ 'POST /api/links/lookup': () => json(429, {}) }));
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(LINK_CLICK, TAB);
    expect(bodyOf('POST', '/api/links')).toBeDefined();
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'savedTo:Shopping' });
  });

  it('says the address cannot be saved for a non-web link and calls no API', async () => {
    await handleClick({ ...LINK_CLICK, linkUrl: 'mailto:ann@example.com' }, TAB);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: BADGE.ErrorText });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'cannotSave' });
  });
});

describe('Save page to Shelfmark', () => {
  it('saves the page address with the trimmed tab title', async () => {
    await handleClick(PAGE_CLICK, TAB);
    expect(bodyOf('POST', '/api/links')).toMatchObject({
      url: 'https://blog.example.org/weekend',
      title: 'Weekend reading',
    });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'savedTo:Shopping' });
  });

  it('leaves the title to the server when the tab has none', async () => {
    await handleClick(PAGE_CLICK, { id: 7 });
    expect(bodyOf('POST', '/api/links')).not.toHaveProperty('title');
  });

  it('ignores clicks on items that are not its own', async () => {
    await handleClick({ menuItemId: 'other' }, TAB);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
  });
});

describe('signed out', () => {
  it('opens the popup (its sign-in screen) when the session is empty, and saves nothing', async () => {
    fetchMock = api({ 'GET /api/auth/get-session': () => json(200, null) });
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(LINK_CLICK, TAB);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: BADGE.ErrorText });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'signInToSave' });
    expect(chrome.action.openPopup).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  it('treats a 401 on save the same way', async () => {
    fetchMock = api(signedIn({ 'POST /api/links': () => json(401, {}) }));
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(PAGE_CLICK, TAB);
    expect(chrome.action.openPopup).toHaveBeenCalledTimes(1);
  });

  it('opens the sign-in page in a new tab where the popup cannot be opened (before Chrome 127)', async () => {
    delete chrome.action.openPopup;
    fetchMock = api({ 'GET /api/auth/get-session': () => json(200, null) });
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(LINK_CLICK, TAB);
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: `${ORIGIN}/sign-in` });
  });

  it('opens the sign-in page when Chrome refuses to open the popup', async () => {
    chrome.action.openPopup?.mockRejectedValue(new Error('No active browser window'));
    fetchMock = api({ 'GET /api/auth/get-session': () => json(200, null) });
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(LINK_CLICK, TAB);
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: `${ORIGIN}/sign-in` });
  });
});

describe('API errors', () => {
  it('shows a ! badge and "Couldn’t save" for a server error', async () => {
    fetchMock = api(signedIn({ 'POST /api/links': () => json(500, { message: 'boom' }) }));
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(LINK_CLICK, TAB);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: BADGE.ErrorText });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      tabId: 7,
      color: BADGE.ErrorColor,
    });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'saveFailed' });
    expect(chrome.action.openPopup).not.toHaveBeenCalled();
  });

  it('says so when the library is full', async () => {
    fetchMock = api(
      signedIn({
        'POST /api/links': () => json(403, { message: `${LINK_ERROR_MESSAGE.LimitReached} (x)` }),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(LINK_CLICK, TAB);
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'libraryFull' });
  });

  it('says "Couldn’t save" when Shelfmark cannot be reached', async () => {
    fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(PAGE_CLICK, TAB);
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'saveFailed' });
  });

  it('reads an error body that is not JSON as no message', async () => {
    fetchMock = api(signedIn({ 'POST /api/links': () => new Response('<html>', { status: 502 }) }));
    vi.stubGlobal('fetch', fetchMock);
    await handleClick(LINK_CLICK, TAB);
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ tabId: 7, title: 'saveFailed' });
  });
});

describe('showResult', () => {
  it('uses the global badge when the click had no tab, and survives a closed tab', async () => {
    chrome.action.setBadgeText.mockRejectedValueOnce(new Error('No tab with id'));
    await expect(
      showResult(undefined, { outcome: SAVE_OUTCOME.Failed, folderName: null }),
    ).resolves.toBeUndefined();
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'saveFailed' });
  });
});
