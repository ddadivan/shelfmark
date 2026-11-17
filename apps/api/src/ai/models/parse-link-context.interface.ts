import type { AiPart } from './ai-part.type';
import type { LinkJobFolder } from './link-job-folder.interface';

/** What `parseLinkOutput` checks the model's answer against: the job's own input, nothing else. */
export interface ParseLinkContext {
  parts: readonly AiPart[];
  /** The user's existing tag names. */
  tags: readonly string[];
  /** The folders offered to the model by key. */
  folders: readonly LinkJobFolder[];
}
