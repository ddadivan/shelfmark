import type { ShortcutKey } from '../../../../shortcuts/models/shortcut-key.type';

/** One browser in the "How to export bookmarks" list. */
export interface ImportHelpStep {
  /** Browser id, also the track key. */
  id: string;
  /** Translation key; `{{keys}}` marks where the key caps go. */
  textKey: string;
  /** The shortcut drawn as caps in place of `{{keys}}`; empty when the text has none. */
  keys: readonly ShortcutKey[];
}
