import type { ExportFolderChoice } from './export-folder-choice.interface';
import type { ExportViewChoice } from './export-view-choice.interface';

/** What the Export dialog is opened with: the folder page it sits on, or the view to export. */
export interface ExportDialogData {
  readonly folder: ExportFolderChoice | null;
  readonly view: ExportViewChoice | null;
}
