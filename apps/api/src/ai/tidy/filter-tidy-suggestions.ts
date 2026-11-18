import { SUGGESTION_KIND, SUGGESTION_STATE, type LinkSuggestion } from '@shelfmark/contracts';
import type { TidyFilterContext } from '../models/tidy-filter-context.interface';
import type { TidySuggestionRow } from '../models/tidy-suggestion-row.interface';

/**
 * The `suggested` rows of one link that Tidy shows and applies (AI-2, #390): a folder only while it
 * is one of the user's live folders and no rule decides the link's folder (a rule always wins); a
 * tag only while it is not on the link yet (case-insensitive); a `new-tag` whose name exists now
 * reads as `tag`. Order is kept.
 */
export function filterTidySuggestions(
  rows: readonly TidySuggestionRow[],
  context: TidyFilterContext,
): LinkSuggestion[] {
  const out: LinkSuggestion[] = [];
  for (const row of rows) {
    if (row.kind === SUGGESTION_KIND.Folder) {
      if (row.folderId === null || context.ruleDecidesFolder) continue;
      if (!context.liveFolderIds.has(row.folderId)) continue;
      out.push({
        id: row.id,
        kind: SUGGESTION_KIND.Folder,
        state: SUGGESTION_STATE.Suggested,
        tagName: null,
        folderId: row.folderId,
      });
      continue;
    }
    if (row.kind !== SUGGESTION_KIND.Tag && row.kind !== SUGGESTION_KIND.NewTag) continue;
    if (row.tagName === null) continue;
    const key = row.tagName.toLowerCase();
    if (context.linkTagKeys.has(key)) continue;
    out.push({
      id: row.id,
      kind: context.tagKeys.has(key) ? SUGGESTION_KIND.Tag : SUGGESTION_KIND.NewTag,
      state: SUGGESTION_STATE.Suggested,
      tagName: row.tagName,
      folderId: null,
    });
  }
  return out;
}
