/** One folder of a shared subtree, as read by the recursive query of `PublicCollectionsService`. */
export interface SubtreeFolder {
  id: string;
  parentId: string | null;
  name: string;
  updatedAt: Date;
}
