import type { ImportSummary } from '@shelfmark/contracts';

/** One import of the mock API: what Recent imports shows and what it created. */
export interface MockImportRecord {
  summary: ImportSummary;
  readonly folderIds: Set<string>;
  readonly linkIds: Set<string>;
  /** Tag names this import created. */
  readonly tagNames: string[];
  undone: boolean;
  /** The import asked for the AI pass (`StartImportRequest.aiPass`). */
  readonly aiPass: boolean;
  /** How often `get` asked since the import finished: the pass is done after a few. */
  aiPolls: number;
}
