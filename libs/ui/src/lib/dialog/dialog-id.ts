let counter = 0;

/** A document-unique id for the title and message elements of a dialog. */
export function nextDialogId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
