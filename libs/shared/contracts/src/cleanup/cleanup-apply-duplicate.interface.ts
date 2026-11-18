/** One duplicate group to apply: the selected copies go to Trash. */
export interface CleanupApplyDuplicate {
  groupId: string;
  /** Link ids of the group to trash; at least one member always stays. */
  trashIds: string[];
}
