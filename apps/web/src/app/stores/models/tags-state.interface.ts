/** State of `TagsStore` besides the tag entities. */
export interface TagsState {
  /** The first list has arrived. */
  loaded: boolean;
  loading: boolean;
  /** The first list failed; the sidebar offers a retry. */
  error: boolean;
}
