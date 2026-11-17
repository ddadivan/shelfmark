import type { AiPart } from './ai-part.type';

/** A job the runner holds the lease of. */
export interface ClaimedJob {
  id: string;
  userId: string;
  linkId: string | null;
  source: string;
  parts: AiPart[];
  language: string;
  attempts: number;
}
