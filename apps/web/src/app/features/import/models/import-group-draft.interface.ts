/** One AI group in step 2a while the user edits it: name, tick and the links it holds. */
export interface ImportGroupDraft {
  /** `g1`, `g2`, … from the API; the folder key of a new group. */
  readonly key: string;
  readonly name: string;
  /** A live own folder the group files into ("already there"); `null` = a new folder. */
  readonly folderId: string | null;
  /** Ticked: a new group becomes a folder, an existing one files its links. Unticked: the target. */
  readonly included: boolean;
  /** Indexes into the grouped links (`ImportGroupsService.links`). */
  readonly linkIndexes: readonly number[];
}
