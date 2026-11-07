/** Folder names the mock folders API treats specially, so the failure paths can be reached by hand and in e2e. */
export const MOCK_FOLDER_NAME = {
  /** Creating a folder with this name fails. */
  CreateFails: 'Fail on create',
  /** Renaming or moving a folder with this name fails (creating it works). */
  UpdateFails: 'Fail on update',
  /** Deleting a folder with this name fails (creating it works). */
  DeleteFails: 'Fail on delete',
} as const;
