/** Thrown by a source parser when the text is not a file of its format. */
export class ImportParseError extends Error {
  constructor() {
    super('Not a file of this format');
    this.name = 'ImportParseError';
  }
}
