/** Tag names the mock tags API treats specially, so the failure paths can be reached by hand and in e2e. */
export const MOCK_TAG_NAME = {
  /** Creating a tag with this name fails. */
  CreateFails: 'fail-on-create',
  /** Renaming or merging a tag with this name fails (creating it works). */
  UpdateFails: 'fail-on-update',
  /** Deleting a tag with this name fails (creating it works). */
  DeleteFails: 'fail-on-delete',
} as const;
