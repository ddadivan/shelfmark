/** A file size ready to be worded: the unit picks the translation key. */
export interface FileSizeParts {
  unit: 'kb' | 'mb';
  value: number;
}
