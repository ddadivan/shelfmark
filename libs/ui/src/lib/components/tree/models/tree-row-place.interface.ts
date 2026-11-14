/** Where a `ui-tree` row sat the last time it was rendered. */
export interface TreeRowPlace {
  /** `id` of its parent row; `null` at the top level. */
  readonly parent: string | null;
  /** `id` of the sibling before it; `null` for the first. */
  readonly previous: string | null;
}
