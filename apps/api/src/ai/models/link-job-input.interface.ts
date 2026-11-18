import type { LinkJobFolder } from './link-job-folder.interface';
import type { AiPart } from './ai-part.type';
import type { LinkJobExample } from './link-job-example.interface';

/**
 * Everything a provider sees for one link: untrusted page data and the user's own vocabulary.
 * Built from the session user's data only, so another user's tags or folders can never appear.
 */
export interface LinkJobInput {
  parts: readonly AiPart[];
  /** A concrete interface language code (`en`, `fr`, ...), never `app` or `browser`. */
  language: string;
  url: string;
  title: string | null;
  description: string | null;
  /** The link's note; present only when "Include my notes" is on. */
  note: string | null;
  /** Visible text of the page, at most `EXCERPT_MAX_CHARS`; `null` when the page could not be read. */
  excerpt: string | null;
  /** The user's existing tag names. */
  tags: readonly string[];
  /** The user's live folders by short key. */
  folders: readonly LinkJobFolder[];
  /** A cleaned-up title is wanted too (Add link drafts only). */
  wantsTitle: boolean;
  /** Earlier choices of the user for the same site (folder keys and own tag names only), newest first. */
  examples: readonly LinkJobExample[];
}
