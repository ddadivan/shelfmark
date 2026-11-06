/** Which message elements of a field currently exist (they are linked by `aria-describedby`). */
export interface FieldDescribedParts {
  /** The field has hint text. */
  readonly hint: boolean;
  /** The field shows an error message. */
  readonly error: boolean;
  /** The field shows a counter. */
  readonly counter: boolean;
}
