/** A table read as cell text. */
export interface ReaderTableData {
  rows: string[][];
  /** The first row is a header row. */
  header: boolean;
}
