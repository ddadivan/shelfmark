import type { TrashRetentionDays } from '@shelfmark/contracts';

/** State of `UserSettingsStore`. */
export interface UserSettingsState {
  /** "Keep deleted items for"; `null` until the settings (or the Trash list) told it. */
  trashRetentionDays: TrashRetentionDays | null;
  /** The settings request is running. */
  loading: boolean;
  /** The first settings request failed; the Library settings offer a retry. */
  error: boolean;
}
