/** Route paths (without the leading slash) used by the route table and by navigation. */
export const APP_PATH = {
  /** Phone only: the Library tab (tiles and folders); tablet and desktop have the sidebar. */
  Library: 'library',
  /** Phone only: the Tags tab. */
  Tags: 'tags',
  Links: 'links',
  Unsorted: 'unsorted',
  Favorites: 'favorites',
  Folders: 'folders',
  /** Recently opened: a page; the phone opens the same list in a sheet. */
  Recent: 'recent',
  /** Deleted links and folders waiting for their retention to pass; reached from the sidebar and the phone Library. */
  Trash: 'trash',
  Settings: 'settings',
  SignIn: 'sign-in',
  Demo: 'demo',
  /** Target of the Android Web Share Target (`share_target.action` in the manifest). */
  Share: 'share',
  /** Public privacy policy: no guard, for guests and signed-in users. */
  Privacy: 'privacy',
} as const;
