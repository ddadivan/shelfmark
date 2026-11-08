/** A tag row with the number of the owner's links, as the service reads it. */
export interface TagWithCount {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { links: number };
}
