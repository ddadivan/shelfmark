import type { AiSettings } from '@shelfmark/contracts';
import type { AiPart } from './ai-part.type';
import type { StoredLinkResult } from './stored-link-result.interface';

/** One result to write to one link, inside the apply transaction. */
export interface ApplyContext {
  userId: string;
  linkId: string;
  jobId: string;
  source: string;
  parts: readonly string[] | readonly AiPart[];
  result: StoredLinkResult;
  settings: AiSettings;
}
