/** One radio card of the export dialog; the keys are Transloco keys. */
export interface ExportFormatOption {
  /** The file format as the API names it. */
  readonly value: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
}
