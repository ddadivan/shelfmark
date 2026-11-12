import type { HexColour, LibrarySettings, TrashRetentionDays } from '@shelfmark/contracts';

/** State of `UserSettingsStore`. */
export interface UserSettingsState {
  /** "Keep deleted items for"; `null` until the settings (or the Trash list) told it. */
  trashRetentionDays: TrashRetentionDays | null;
  /** "Folder colours"; `null` until the settings told it (shown as on). */
  folderColours: boolean | null;
  /** "Pause history" on Recently opened; `null` until the settings told it (shown as off). */
  pauseHistory: boolean | null;
  /** Settings › Library › Viewing and Saving; `null` until the settings told it (the defaults show). */
  library: LibrarySettings | null;
  /** Own colours (`#rrggbb`) the account keeps as swatches (#335); empty until the settings told. */
  customColours: HexColour[];
  /** The settings request is running. */
  loading: boolean;
  /** The first settings request failed; the Library settings offer a retry. */
  error: boolean;
}
