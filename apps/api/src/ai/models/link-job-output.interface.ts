import type { LinkKind } from '@shelfmark/contracts';

/**
 * The validated output of a link job (`parseLinkOutput`): plain text only, tags from the user's own
 * names, a folder resolved from its key. A part that was not asked for is empty or `null`.
 */
export interface LinkJobOutput {
  /** Existing tag names, at most `AI_LIMIT.SuggestedTagsMax`. */
  tags: string[];
  /** One new tag name in lower case that passes the tag rules and is not an existing tag. */
  newTag: string | null;
  /** The key of one of the folders given in the input (`f1`, ...). */
  folder: string | null;
  /** Trimmed, no control characters, at most `AI_LIMIT.SummaryMax`. */
  summary: string | null;
  /** A cleaned-up title (only for a draft), plain text, at most `LINK_LIMIT.TitleMax`. */
  title: string | null;
  kind: LinkKind | null;
}
