import type { ExportFormat } from '@shelfmark/contracts';
import type { IconName } from '@shelfmark/ui';

/**
 * One export format as every export entry shows it (the export dialog, the library Export menu,
 * Settings › Account › Your data); the keys are Transloco keys.
 */
export interface ExportFormatOption {
  /** The file format as the API names it. */
  readonly value: ExportFormat;
  /** The format's name ("JSON", "Bookmarks HTML", "CSV"): dialog card, settings row, button names. */
  readonly titleKey: string;
  /** What the file holds or is for: dialog card and settings row. */
  readonly descriptionKey: string;
  /** Menu item and settings row icon. */
  readonly icon: IconName;
  /** Library Export menu: the current view in this format. */
  readonly viewKey: string;
  /** Library Export menu: the whole library in this format. */
  readonly allKey: string;
}
