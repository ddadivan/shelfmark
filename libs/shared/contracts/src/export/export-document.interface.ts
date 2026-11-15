import type { ExportFolder } from './export-folder.interface';
import type { ExportLink } from './export-link.interface';
import type { ExportRule } from './export-rule.interface';

/** The JSON export file. */
export interface ExportDocument {
  /** `EXPORT_SCHEMA_VERSION`. */
  schemaVersion: number;
  exportedAt: string;
  folders: ExportFolder[];
  links: ExportLink[];
  /**
   * The domain rules (#398), sorted by domain: every rule in a full export, none in an export of one
   * folder or of a filtered list (rules are account settings, not part of a subset). Added without a
   * schema version change: readers of version 1 may find the key missing.
   */
  rules: ExportRule[];
}
