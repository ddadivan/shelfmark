/** A direct subfolder of a shared folder, for the filter chips of the public page. */
export interface PublicCollectionFolder {
  id: string;
  name: string;
  /** Links in this subfolder and everything below it. */
  linkCount: number;
}
