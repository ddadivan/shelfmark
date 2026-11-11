/**
 * The public link of one folder as its owner sees it (`GET|POST|PATCH /api/folders/:id/share`).
 * `enabled: false` means the folder has no public link: `token` and `createdAt` are then `null`.
 */
export interface FolderShareResponse {
  folderId: string;
  enabled: boolean;
  /** The capability in the public URL `/c/{token}`: 22 base64url characters (128 random bits). */
  token: string | null;
  /** Guests see the notes of the links. Off by default. */
  showNotes: boolean;
  /** When the current token was created (enable or the last reset). */
  createdAt: string | null;
}
