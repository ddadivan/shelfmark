/** Route paths (without the leading slash) used by the route table and by navigation. */
export const APP_PATH = {
  Links: 'links',
  Unsorted: 'unsorted',
  Favorites: 'favorites',
  Folders: 'folders',
  /** Recently opened: a plain page for now (the full history page is issue #241). */
  Recent: 'recent',
  Settings: 'settings',
  SignIn: 'sign-in',
  Demo: 'demo',
  /** Target of the Android Web Share Target (`share_target.action` in the manifest). */
  Share: 'share',
  /** Public privacy policy: no guard, for guests and signed-in users. */
  Privacy: 'privacy',
} as const;
