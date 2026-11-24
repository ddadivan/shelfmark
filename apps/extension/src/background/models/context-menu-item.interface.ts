/** The `chrome.contextMenus.create` properties the worker uses. */
export interface ContextMenuItem {
  id: string;
  title: string;
  contexts: ('link' | 'page')[];
  documentUrlPatterns?: string[];
  targetUrlPatterns?: string[];
}
