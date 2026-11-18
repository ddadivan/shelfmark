import type { LinkResponse } from '@shelfmark/contracts';

/** The links a batch inserted (by idempotency key) and the AI jobs to start after the commit. */
export interface BatchInsertResult {
  links: Map<string, LinkResponse>;
  aiJobIds: string[];
}
