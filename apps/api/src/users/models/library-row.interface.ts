/** The Settings › Library columns of `users` as Prisma returns them (`LIBRARY_SELECT`). */
export interface LibraryRow {
  defaultView: string;
  defaultSort: string;
  openLinksIn: string;
  showFolderCounts: boolean;
  newLinksFolderId: string | null;
  fetchPreviews: boolean;
}
