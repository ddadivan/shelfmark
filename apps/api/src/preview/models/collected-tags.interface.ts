export interface CollectedTags {
  meta: Map<string, string>;
  title: string | null;
  icons: string[];
  appleIcons: string[];
  /** First `<base href>` of the document, as written. */
  baseHref: string | null;
  /** Text of the `<script type="application/ld+json">` blocks, at most `maxJsonLdScripts`. */
  jsonLd: string[];
}
