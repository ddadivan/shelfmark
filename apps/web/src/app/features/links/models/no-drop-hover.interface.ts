/** The row that cannot take the dragged link and is under the pointer. */
export interface NoDropHover {
  /** Row id: the tree row id, or the key of a pinned link. */
  readonly id: string;
  /** Translation key of the reason. */
  readonly reasonKey: string;
}
