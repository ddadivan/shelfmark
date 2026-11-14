/** One public link of the mock API, kept in `localStorage` under `MOCK_SHARES_STORAGE_KEY`. */
export interface MockShareRecord {
  token: string;
  folderId: string;
  showNotes: boolean;
  /** The owner's first name, captured at enable time (a guest has no session to read it from). */
  ownerName: string;
  createdAt: string;
}
