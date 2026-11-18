/** A tag in a similar-tags pair, read live. */
export interface CleanupTag {
  id: string;
  name: string;
  /** Live links carrying the tag. */
  links: number;
}
