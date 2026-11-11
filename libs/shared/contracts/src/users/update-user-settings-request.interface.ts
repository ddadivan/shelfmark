import type { TrashRetentionDays } from '../trash/trash-retention-days.type';

/** `PATCH /api/me/settings`: send only the fields to change; answers `UserSettingsResponse`. */
export interface UpdateUserSettingsRequest {
  /** One of `TRASH_RETENTION_DAYS`. */
  trashRetentionDays?: TrashRetentionDays;
  folderColours?: boolean;
}
