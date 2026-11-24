import type { LinkResponse, ReaderProgress } from '@shelfmark/contracts';

/** One row of "Continue reading": the link and how far it was read. */
export interface ContinueItem {
  link: LinkResponse;
  progress: ReaderProgress;
}
