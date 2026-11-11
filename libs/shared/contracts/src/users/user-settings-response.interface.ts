import type { TrashRetentionDays } from '../trash/trash-retention-days.type';

/** `GET /api/me/settings`: preferences kept on the account, so they follow the user to every device. */
export interface UserSettingsResponse {
  trashRetentionDays: TrashRetentionDays;
  /** Coloured folder icons; off shows every folder in graphite. Default on. */
  folderColours: boolean;
}
