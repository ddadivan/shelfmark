import type { ExportFolder } from './export-folder.interface';
import type { ExportLink } from './export-link.interface';

/** The JSON export file. */
export interface ExportDocument {
  /** `EXPORT_SCHEMA_VERSION`. */
  schemaVersion: number;
  exportedAt: string;
  folders: ExportFolder[];
  links: ExportLink[];
}
