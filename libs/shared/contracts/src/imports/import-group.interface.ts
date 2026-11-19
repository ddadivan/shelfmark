/** One topic of `ImportGroupsResponse`. */
export interface ImportGroup {
  /** Stable within the response (`g1`, `g2`, …); the client uses it as the folder key. */
  key: string;
  /** Folder name in the user's language, at most `FOLDER_LIMIT.NameMax`. */
  name: string;
  /** A live own folder the group files into ("already there"); `null` = a new folder. */
  folderId: string | null;
  /** Indexes into the request's `links`, ascending; every index is in at most one group. */
  linkIndexes: number[];
}
