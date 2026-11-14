/** Router commands and query parameters of a library page. */
export interface LibraryRoute {
  readonly commands: readonly string[];
  readonly queryParams: Readonly<Record<string, string | readonly string[]>>;
}
