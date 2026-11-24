import type { ReaderProgress } from './reader-progress.interface';

/** `GET /api/reader/progress/:linkId`: the stored progress of one live link, `null` when none. */
export interface ReaderProgressResponse {
  progress: ReaderProgress | null;
}
