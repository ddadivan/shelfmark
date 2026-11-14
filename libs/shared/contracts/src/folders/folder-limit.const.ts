/**
 * Limits for folders. `PerUserMax` is the number of folders one user may have (create answers 409
 * beyond it); `DescriptionMax` is the length of the optional description after trimming (#418).
 */
export const FOLDER_LIMIT = { NameMax: 100, PerUserMax: 500, DescriptionMax: 140 } as const;
