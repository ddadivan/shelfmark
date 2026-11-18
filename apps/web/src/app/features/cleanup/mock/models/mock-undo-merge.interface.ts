/** How the mock reverts one tag merge (like the API's stored Undo). */
export interface MockUndoMerge {
  keptTagId: string;
  mergedName: string;
  linkIds: string[];
  addedLinkIds: string[];
}
