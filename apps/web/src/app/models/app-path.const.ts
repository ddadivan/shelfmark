/** Route paths (without the leading slash) used by the route table and by navigation. */
export const APP_PATH = {
  /** Phone only: the Library tab (tiles and folders); tablet and desktop have the sidebar. */
  Library: 'library',
  /** Phone only: the Tags tab. */
  Tags: 'tags',
  /** Ask your shelf full screen: the Ask tab of the mobile shell while Ask is on (AI-4, #499). */
  Ask: 'ask',
  /** Today (Shelf): back to these, saved this week, from your shelf, a few links; a tab below 64em. */
  Today: 'today',
  Links: 'links',
  Unsorted: 'unsorted',
  /** Tidy Unsorted (AI-2): review the AI suggestions of the links in Unsorted; only while AI is on. */
  Tidy: 'unsorted/tidy',
  Favorites: 'favorites',
  Folders: 'folders',
  /** Recently opened: a page; the phone opens the same list in a sheet. */
  Recent: 'recent',
  /** Due and upcoming reminders (#275); reached from the sidebar and the phone Library. */
  Reminders: 'reminders',
  /** Shelf Revisit: due reminders, continue reading, forgotten and recently opened in one queue. */
  Revisit: 'revisit',
  /** Deleted links and folders waiting for their retention to pass; reached from the sidebar and the phone Library. */
  Trash: 'trash',
  /** Import bookmarks (Shelf 09-data): a page with numbered steps. */
  Import: 'import',
  Settings: 'settings',
  /** The author's pages (`/admin/feedback`, `/admin/stats`); behind `adminOnly`. */
  Admin: 'admin',
  SignIn: 'sign-in',
  Demo: 'demo',
  /** Target of the Android Web Share Target (`share_target.action` in the manifest). */
  Share: 'share',
  /** The landing page for everyone (#270): signed-in people reach it from the account menu. */
  About: 'about',
  /** Public privacy policy: no guard, for guests and signed-in users. */
  Privacy: 'privacy',
  /** Public list of releases (#424): no guard, for guests and signed-in users. */
  Changelog: 'changelog',
  /** The public Help center (Shelf 17-help): `/help`, `/help/:articleId`; no guard. */
  Help: 'help',
  /** A public collection (`/c/:token`, #276): no guard, outside the app shell. */
  Collection: 'c',
} as const;
