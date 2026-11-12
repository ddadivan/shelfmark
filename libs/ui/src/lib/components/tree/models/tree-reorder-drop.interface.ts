/** A row of one sibling list was dropped at `currentIndex` (it started at `previousIndex`). */
export interface TreeReorderDrop {
  id: string;
  previousIndex: number;
  currentIndex: number;
}
