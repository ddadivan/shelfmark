/** One bulk update that undoes "Apply to existing links" for links that got the same new tags. */
export interface RuleUndoGroup {
  ids: string[];
  /** The rule tags these links did not have before (taken off again). */
  removeTags: string[];
}
