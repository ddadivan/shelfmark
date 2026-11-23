/** The translated names of the fixed rows and the folder button, resolved once per language. */
export interface SidebarLabels {
  all: string;
  unsorted: string;
  favorites: string;
  /** The "..." button name with its `{name}` placeholder; `ui-tree` fills in the folder. */
  actions: string;
  recent: string;
  reminders: string;
  trash: string;
  /** "Data & help" (#387). */
  data: string;
  /** Accessible name of the dot on "What's new" while a release is unseen. */
  whatsNewDot: string;
  /** "Get the extension" (#455). */
  extension: string;
  /** "Theme" (Shelf): the footer row that switches Light and Dark. */
  theme: string;
}
