import { EXPORT_FORMAT } from '@shelfmark/contracts';
import type { ExportFormatOption } from './export-format-option.interface';

/**
 * The cards of the export dialog, in order. The dialog offers only those the contract's
 * `ExportFormat` has.
 */
export const EXPORT_FORMAT_OPTIONS: readonly ExportFormatOption[] = [
  {
    value: EXPORT_FORMAT.Json,
    titleKey: 'export.dialog.format.json.title',
    descriptionKey: 'export.dialog.format.json.description',
  },
  {
    value: EXPORT_FORMAT.Html,
    titleKey: 'export.dialog.format.html.title',
    descriptionKey: 'export.dialog.format.html.description',
  },
  {
    value: EXPORT_FORMAT.Csv,
    titleKey: 'export.dialog.format.csv.title',
    descriptionKey: 'export.dialog.format.csv.description',
  },
];
