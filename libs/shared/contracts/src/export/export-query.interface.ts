import type { ExportFormat } from './export-format.type';

/** `GET /api/export` query. The handler sees the parsed values. */
export interface ExportQuery {
  format: ExportFormat;
  /** UUID of a folder: exports that folder and all its subfolders. Foreign or missing is a 404. */
  folderId?: string;
  /** Tag names (repeated parameter), same semantics as `ListLinksQuery.tag` (case-insensitive, AND). */
  tag?: string[];
  /** Search in title, note and URL (case-insensitive substring), at most `LINK_LIMIT.QueryMax` characters. */
  q?: string;
}
