/**
 * The fields of the `chrome.tabs.Tab` that `contextMenus.onClicked` passes. The click grants
 * `activeTab` for that tab, so its title is there; without one the server reads the page's title.
 */
export interface ContextMenuTab {
  id?: number;
  title?: string;
}
