export interface CollectedTags {
  meta: Map<string, string>;
  title: string | null;
  icons: string[];
  appleIcons: string[];
  /** First `<base href>` of the document, as written. */
  baseHref: string | null;
}
