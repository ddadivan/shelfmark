/** Hosts the mock links API treats specially, so the dialog and feed states can be reached by hand and in e2e. */
export const MOCK_HOST = {
  /** The preview request fails. */
  Unreachable: 'unreachable.example',
  /** Saving fails. */
  SaveFails: 'save-fails.example',
  /** Editing (`PATCH`, favorite included) fails. */
  PatchFails: 'patch-fails.example',
  /** Deleting fails. */
  DeleteFails: 'delete-fails.example',
} as const;
