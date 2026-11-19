import type { ImportSource } from '@shelfmark/contracts';
import type { ParsedImport } from './parsed-import.interface';

/**
 * One source of the import dialog (the seam of ADR 0056): a new source is one more entry in
 * `IMPORT_SOURCES` with its parser and translations.
 */
export interface ImportSourceOption {
  readonly id: ImportSource;
  readonly titleKey: string;
  readonly descriptionKey: string;
  /** `accept` of the file picker. */
  readonly accept: string;
  /**
   * Reads the file's text into folders and links (`untitled` names a folder without a name);
   * throws `ImportParseError` when it is not this format.
   */
  readonly parse: (text: string, untitled: string) => ParsedImport;
}
