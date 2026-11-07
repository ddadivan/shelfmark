/** Hosts the mock links API treats specially, so the dialog states can be reached by hand and in e2e. */
export const MOCK_HOST = {
  /** The preview request fails. */
  Unreachable: 'unreachable.example',
  /** Saving fails. */
  SaveFails: 'save-fails.example',
} as const;
