import { APP_PATH } from '../app/core/config/models/app-path.const';
import { SHELFMARK_ORIGIN } from '../app/core/config/shelfmark-origin.const';
import { toPageInfo } from '../app/popup/utils/to-page-info';
import { BADGE } from './models/badge.const';
import type { ContextMenuClick } from './models/context-menu-click.interface';
import type { ContextMenuTab } from './models/context-menu-tab.interface';
import { HTTP_URL_PATTERNS } from './models/http-url-patterns.const';
import { MENU_ID } from './models/menu-id.const';
import { MESSAGE_KEY } from './models/message-key.const';
import type { MessageKey } from './models/message-key.type';
import { SAVE_OUTCOME } from './models/save-outcome.const';
import type { SaveResult } from './models/save-result.interface';
import type { WorkerChrome } from './models/worker-chrome.interface';
import { saveToShelfmark } from './save-to-shelfmark';

/**
 * The extension API global of the service worker. Called literally (`chrome.contextMenus.create`,
 * `chrome.action.setBadgeText`, …) so the Chrome Web Store scan sees what the `contextMenus`
 * permission is used for (#478).
 */
declare const chrome: WorkerChrome;

const text = (key: MessageKey, substitution?: string): string =>
  chrome.i18n.getMessage(key, substitution);

/** Badge calls fail when the tab closed meanwhile; that is no error worth reporting. */
async function quietly(work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
  } catch {
    // The tab is gone: nothing to show.
  }
}

/** The two items of 07-extension's "Right-click save": on a link, and on the page itself. */
export async function createMenu(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_ID.SaveLink,
    title: text(MESSAGE_KEY.MenuSaveLink),
    contexts: ['link'],
    targetUrlPatterns: HTTP_URL_PATTERNS,
  });
  chrome.contextMenus.create({
    id: MENU_ID.SavePage,
    title: text(MESSAGE_KEY.MenuSavePage),
    contexts: ['page'],
    documentUrlPatterns: HTTP_URL_PATTERNS,
  });
}

function tooltip(result: SaveResult): string {
  const folder = result.folderName ?? text(MESSAGE_KEY.Unsorted);
  switch (result.outcome) {
    case SAVE_OUTCOME.Saved:
      return text(MESSAGE_KEY.SavedTo, folder);
    case SAVE_OUTCOME.AlreadySaved:
      return text(MESSAGE_KEY.AlreadySavedIn, folder);
    case SAVE_OUTCOME.SignedOut:
      return text(MESSAGE_KEY.SignInToSave);
    case SAVE_OUTCOME.Unsupported:
      return text(MESSAGE_KEY.CannotSave);
    case SAVE_OUTCOME.LibraryFull:
      return text(MESSAGE_KEY.LibraryFull);
    default:
      return text(MESSAGE_KEY.SaveFailed);
  }
}

/**
 * The result on the toolbar button of that tab: a ✓ or ! badge (the design's toast needs a content
 * script, which the extension does not have) and the words ("Saved to Shopping") in its tooltip.
 * Both go back to normal after `BADGE.ClearMs`.
 */
export async function showResult(tabId: number | undefined, result: SaveResult): Promise<void> {
  const ok = result.outcome === SAVE_OUTCOME.Saved || result.outcome === SAVE_OUTCOME.AlreadySaved;
  const target = tabId === undefined ? {} : { tabId };
  await quietly(() =>
    Promise.all([
      chrome.action.setBadgeText({ ...target, text: ok ? BADGE.SuccessText : BADGE.ErrorText }),
      chrome.action.setBadgeBackgroundColor({
        ...target,
        color: ok ? BADGE.SuccessColor : BADGE.ErrorColor,
      }),
      chrome.action.setBadgeTextColor({ ...target, color: BADGE.TextColor }),
      chrome.action.setTitle({ ...target, title: tooltip(result) }),
    ]),
  );
  setTimeout(() => {
    void quietly(() =>
      Promise.all([
        chrome.action.setBadgeText({ ...target, text: '' }),
        chrome.action.setTitle({ ...target, title: text(MESSAGE_KEY.ActionTitle) }),
      ]),
    );
  }, BADGE.ClearMs);
}

/**
 * Signed out: the popup, which shows "Sign in to save this page" (07-extension). Before Chrome 127,
 * or when Chrome refuses (no focused window), the sign-in page opens in a new tab instead.
 */
async function openSignIn(): Promise<void> {
  try {
    if (chrome.action.openPopup === undefined) throw new Error('openPopup is not available');
    await chrome.action.openPopup();
  } catch {
    await quietly(() => chrome.tabs.create({ url: `${SHELFMARK_ORIGIN}${APP_PATH.SignIn}` }));
  }
}

/** One click on a menu item: save the link or the page, then show how it went. */
export async function handleClick(info: ContextMenuClick, tab?: ContextMenuTab): Promise<void> {
  let url: string | undefined;
  let title: string | null = null;
  if (info.menuItemId === MENU_ID.SaveLink) {
    // The link's own title is not known here; the server reads it from the page.
    url = info.linkUrl;
  } else if (info.menuItemId === MENU_ID.SavePage) {
    url = info.pageUrl;
    const page = toPageInfo(url === undefined ? null : { url, title: tab?.title ?? '' });
    title = page?.titleFromTab === true ? page.title : null;
  } else {
    return;
  }
  const result = await saveToShelfmark(url ?? '', title);
  await showResult(tab?.id, result);
  if (result.outcome === SAVE_OUTCOME.SignedOut) await openSignIn();
}

/** Wires the worker: the menu on install and update, the click handler on every start. */
export function registerContextMenu(): void {
  chrome.runtime.onInstalled.addListener(() => {
    void createMenu();
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    void handleClick(info, tab);
  });
}
