import type { ImportSource } from './import-source.type';

/** One import in `GET /api/imports` (Recent imports). */
export interface ImportSummary {
  id: string;
  source: ImportSource;
  fileName: string;
  createdAt: string;
  /** `null` while batches may still come. */
  finishedAt: string | null;
  /** The target folder while it is live, else `null`. */
  targetFolderId: string | null;
  linksCreated: number;
  foldersCreated: number;
  skipped: number;
  failed: number;
}
