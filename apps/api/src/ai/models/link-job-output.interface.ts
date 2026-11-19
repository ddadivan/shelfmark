import type { LinkKind } from '@shelfmark/contracts';

/**
 * The validated output of a link job (`parseLinkOutput`): plain text only, tags from the user's own
 * names, a folder resolved from its key. A part that was not asked for is empty or `null`.
 */
export interface LinkJobOutput {
  /** Existing tag names, at most `AI_LIMIT.SuggestedTagsMax`. */
  tags: string[];
  /** New tag names in lower case, no repeats, each passing the tag rules and not an existing tag; at most `AI_LIMIT.NewTagsMax`. */
  newTags: string[];
  /** Extra new-tag ideas (chips only): same rules, not in `newTags`, at most `AI_LIMIT.MoreTagsMax`. */
  moreTags: string[];
  /** The key of one of the folders given in the input (`f1`, ...). */
  folder: string | null;
  /** Trimmed, no control characters, at most `AI_LIMIT.SummaryMax`. */
  summary: string | null;
  /** A cleaned-up title (only for a draft), plain text, at most `LINK_LIMIT.TitleMax`. */
  title: string | null;
  kind: LinkKind | null;
}
