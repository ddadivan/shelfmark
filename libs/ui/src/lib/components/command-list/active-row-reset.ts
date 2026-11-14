/**
 * When the active option of `ui-command-list` goes back to the first row. A new query starts again
 * at the top (the best match comes first). Results usually arrive after the query, so a query
 * change also stays pending until the rows next change, which resets to the top once more.
 */
export class ActiveRowReset {
  private lastIds = '';
  private pending = false;

  constructor(private lastQuery: string) {}

  /** Records the current query and row ids (joined); true when the first row should be active. */
  next(query: string, ids: string): boolean {
    const queryChanged = query !== this.lastQuery;
    this.lastQuery = query;
    const rowsChanged = ids !== this.lastIds;
    this.lastIds = ids;
    this.pending = this.pending || queryChanged;
    const resetToTop = queryChanged || (this.pending && rowsChanged);
    if (rowsChanged) {
      this.pending = false;
    }
    return resetToTop;
  }
}
