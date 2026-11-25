/** The columns of a link row that a keyset cursor reads. */
export interface CursorRow {
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt: Date | null;
  titleSortKey: string;
  host: string;
  isFavorite: boolean;
}
