/**
 * Data attribute of a drop target in the feed: a subfolder tile or a half of the side-by-side
 * view. Its value is the folder id, or `LINKS_SCOPE.Unsorted` (`unsorted`) for Unsorted: a drop
 * there removes the folder. Rows of the sidebar tree are found by `data-ui-tree-id` instead.
 */
export const LINK_DROP_ATTRIBUTE = 'data-link-drop-folder';
