/** A tag of the user with its number of live links (the name stays in memory, never stored). */
export interface TagUsage {
  id: string;
  name: string;
  links: number;
}
