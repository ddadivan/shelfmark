/** The fields of `chrome.contextMenus.OnClickData` the worker reads. */
export interface ContextMenuClick {
  menuItemId: string | number;
  /** The link's address, for the "link" context. */
  linkUrl?: string;
  /** The address of the page the menu was opened on. */
  pageUrl?: string;
}
