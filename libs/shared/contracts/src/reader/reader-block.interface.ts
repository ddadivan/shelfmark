import type { ReaderBlockKind } from './reader-block-kind.type';
import type { ReaderHeadingLevel } from './reader-heading-level.type';
import type { ReaderListItem } from './reader-list-item.interface';
import type { ReaderSpan } from './reader-span.interface';

/**
 * One block of a Reader article. Plain text only, never HTML. Which fields carry data depends on
 * `kind`; the others are empty (`''`, `[]`, `false` or `null`):
 *
 * - heading: `text`, `spans`, `level`
 * - paragraph, quote: `text`, `spans`
 * - note: `label` (the callout's name, "Note", "Warning"), `text`, `spans`
 * - list: `ordered`, `items` (nested)
 * - code: `text` (line breaks kept), `language` when the page marks one
 * - table: `rows` (cell text), `header` (the first row is a header)
 * - image: `imageUrl` (absolute `http` / `https` source, **not** loaded by the web app: the CSP is
 *   `img-src 'self'`, so it shows a placeholder with "Open original"), `alt`, `text` (the caption)
 *
 * `text` is always the plain text of `spans` (reading time, search, fallback).
 */
export interface ReaderBlock {
  kind: ReaderBlockKind;
  text: string;
  spans: ReaderSpan[];
  /** List items; empty for every other kind. */
  items: ReaderListItem[];
  /** A numbered list (`<ol>`); `false` for every other kind. */
  ordered: boolean;
  /** Heading level; `null` for every other kind. */
  level: ReaderHeadingLevel | null;
  /** Name of a note ("Note", "Tip", "Warning"); `null` for every other kind. */
  label: string | null;
  /** Language of a code block as the page marks it (`typescript`); `null` when it does not. */
  language: string | null;
  /** Table rows of cell text; empty for every other kind. */
  rows: string[][];
  /** The first table row is a header row. */
  header: boolean;
  /** Absolute http(s) source of an image; `null` for every other kind. */
  imageUrl: string | null;
  /** Alternative text of an image; `''` for every other kind. */
  alt: string;
}
