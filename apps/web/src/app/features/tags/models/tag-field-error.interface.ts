/** A message under the tag name field: a translation key and its parameters. */
export interface TagFieldError {
  readonly key: string;
  readonly params?: Record<string, unknown>;
}
