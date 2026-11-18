import type { AiPart } from './ai-part.type';

/** One link of a claimed backfill chunk with its job (the page is read after the claim). */
export interface BackfillChunkJob {
  jobId: string;
  linkId: string;
  parts: AiPart[];
  language: string;
  url: string;
  title: string;
  note: string | null;
}
