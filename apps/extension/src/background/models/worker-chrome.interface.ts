import type { ChromeEvent } from './chrome-event.interface';
import type { ContextMenuClick } from './context-menu-click.interface';
import type { ContextMenuItem } from './context-menu-item.interface';
import type { ContextMenuTab } from './context-menu-tab.interface';

/**
 * The part of the `chrome` global the background worker calls (no `@types/chrome` dependency).
 * `contextMenus` needs the `contextMenus` permission; `action`, `i18n`, `runtime` and `tabs.create`
 * need none. `action.openPopup` exists for every extension from Chrome 127, so it is optional.
 */
export interface WorkerChrome {
  runtime: {
    onInstalled: ChromeEvent<() => void>;
  };
  contextMenus: {
    create(properties: ContextMenuItem): unknown;
    removeAll(): Promise<void>;
    onClicked: ChromeEvent<(info: ContextMenuClick, tab?: ContextMenuTab) => void>;
  };
  action: {
    setBadgeText(details: { text: string; tabId?: number }): Promise<void>;
    setBadgeBackgroundColor(details: { color: string; tabId?: number }): Promise<void>;
    setBadgeTextColor(details: { color: string; tabId?: number }): Promise<void>;
    setTitle(details: { title: string; tabId?: number }): Promise<void>;
    openPopup?: () => Promise<void>;
  };
  i18n: {
    getMessage(key: string, substitutions?: string | string[]): string;
  };
  tabs: {
    create(properties: { url: string }): Promise<unknown>;
  };
}
