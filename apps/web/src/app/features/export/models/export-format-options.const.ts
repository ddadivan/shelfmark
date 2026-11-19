import { EXPORT_FORMAT } from '@shelfmark/contracts';
import type { ExportFormatOption } from './export-format-option.interface';

/**
 * Every export format, in order: the only list the export dialog, the library Export menu and
 * Settings › Account › Your data render, so a new format shows everywhere at once.
 */
export const EXPORT_FORMAT_OPTIONS: readonly ExportFormatOption[] = [
  {
    value: EXPORT_FORMAT.Json,
    titleKey: 'export.dialog.format.json.title',
    descriptionKey: 'export.dialog.format.json.description',
    icon: 'code',
    viewKey: 'export.view.json',
    allKey: 'export.all.json',
  },
  {
    value: EXPORT_FORMAT.Html,
    titleKey: 'export.dialog.format.html.title',
    descriptionKey: 'export.dialog.format.html.description',
    icon: 'globe',
    viewKey: 'export.view.html',
    allKey: 'export.all.html',
  },
  {
    value: EXPORT_FORMAT.Csv,
    titleKey: 'export.dialog.format.csv.title',
    descriptionKey: 'export.dialog.format.csv.description',
    icon: 'list',
    viewKey: 'export.view.csv',
    allKey: 'export.all.csv',
  },
];
