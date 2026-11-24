/** The reading settings columns of `users` as Prisma returns them (`READER_SELECT`). */
export interface ReaderRow {
  readerTheme: string | null;
  readerFont: string;
  readerSize: number;
  readerLineSpacing: string;
  readerLineWidth: string;
  readerSavedAt: Date | null;
}
