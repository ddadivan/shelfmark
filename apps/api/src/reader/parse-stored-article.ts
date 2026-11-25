import {
  READER_ARTICLE_VERSION,
  READER_BLOCK_KIND,
  type ReaderArticle,
  type ReaderBlock,
  type ReaderBlockKind,
  type ReaderHeadingLevel,
  type ReaderListItem,
  type ReaderSpan,
} from '@shelfmark/contracts';
import { newBlock } from './extract/new-block';
import { toHttpUrl } from './extract/resolve-url';
import { READER_EXTRACT_LIMIT } from './models/reader-extract-limit.const';

const KINDS: readonly string[] = Object.values(READER_BLOCK_KIND);
const LEVELS: readonly number[] = [2, 3, 4];
const FIRST_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function textSpan(text: string): ReaderSpan {
  return { text, href: null, code: false, emphasis: false, strong: false };
}

function toSpan(value: unknown): ReaderSpan | null {
  if (!isRecord(value)) return null;
  const { text, href, code, emphasis, strong } = value;
  if (typeof text !== 'string') return null;
  if (typeof code !== 'boolean' || typeof emphasis !== 'boolean' || typeof strong !== 'boolean') {
    return null;
  }
  if (href !== null && typeof href !== 'string') return null;
  // A stored link is checked again: only an absolute http(s) address survives.
  return { text, href: href === null ? null : toHttpUrl(href, null), code, emphasis, strong };
}

function toSpans(value: unknown): ReaderSpan[] | null {
  if (!Array.isArray(value)) return null;
  const spans = value.map(toSpan);
  return spans.every((span) => span !== null) ? spans : null;
}

function toItem(value: unknown, depth: number): ReaderListItem | null {
  if (!isRecord(value) || depth > READER_EXTRACT_LIMIT.ListDepthMax) return null;
  const spans = toSpans(value['spans']);
  const items = toItems(value['items'], depth + 1);
  return spans === null || items === null ? null : { spans, items };
}

function toItems(value: unknown, depth: number): ReaderListItem[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => toItem(item, depth));
  return items.every((item) => item !== null) ? items : null;
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' ? value : undefined;
}

/** A block of a version 1 article (plain text, `items` were strings), as a version 2 block. */
function upgradeBlock(value: unknown): ReaderBlock | null {
  if (!isRecord(value)) return null;
  const { kind, text, items } = value;
  if (typeof kind !== 'string' || !KINDS.includes(kind) || typeof text !== 'string') return null;
  if (!isStringArray(items)) return null;
  const level = kind === READER_BLOCK_KIND.Heading ? 2 : null;
  return newBlock(kind as ReaderBlockKind, {
    text,
    spans: text === '' ? [] : [textSpan(text)],
    items: items.map((item) => ({ spans: [textSpan(item)], items: [] })),
    level,
  });
}

function toBlock(value: unknown): ReaderBlock | null {
  if (!isRecord(value)) return null;
  const { kind, text, level, ordered, header, alt } = value;
  const spans = toSpans(value['spans']);
  const items = toItems(value['items'], 1);
  const label = nullableString(value['label']);
  const language = nullableString(value['language']);
  const imageUrl = nullableString(value['imageUrl']);
  const rows = value['rows'];
  if (typeof kind !== 'string' || !KINDS.includes(kind) || typeof text !== 'string') return null;
  if (spans === null || items === null) return null;
  if (label === undefined || language === undefined || imageUrl === undefined) return null;
  if (typeof ordered !== 'boolean' || typeof header !== 'boolean' || typeof alt !== 'string') {
    return null;
  }
  if (level !== null && (typeof level !== 'number' || !LEVELS.includes(level))) return null;
  if (!Array.isArray(rows) || !rows.every(isStringArray)) return null;
  return {
    kind: kind as ReaderBlockKind,
    text,
    spans,
    items,
    ordered,
    level: level as ReaderHeadingLevel | null,
    label,
    language,
    rows,
    header,
    // A stored image source is checked again: only an absolute http(s) address survives.
    imageUrl: imageUrl === null ? null : toHttpUrl(imageUrl, null),
    alt,
  };
}

/** The shape version a stored article was written with (`1` when it carries none). */
export function storedArticleVersion(value: unknown): number {
  if (!isRecord(value)) return FIRST_VERSION;
  const version = value['version'];
  return typeof version === 'number' && Number.isInteger(version) ? version : FIRST_VERSION;
}

/**
 * Reads a stored `link_reader_articles.article` back into the contract shape. A version 1 article
 * (plain text) is upgraded to spans; the caller extracts it again when the page can be fetched
 * (`storedArticleVersion` below `READER_ARTICLE_VERSION`). Anything that does not match (a hand
 * edit, an unknown shape) is `null`, so the caller extracts again.
 */
export function parseStoredArticle(value: unknown): ReaderArticle | null {
  if (!isRecord(value)) return null;
  const { title, minutes, blocks } = value;
  const author = nullableString(value['author']);
  const publishedAt = nullableString(value['publishedAt']);
  if (typeof title !== 'string' || author === undefined || publishedAt === undefined) return null;
  if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1) return null;
  if (!Array.isArray(blocks)) return null;
  const version = storedArticleVersion(value);
  if (version > READER_ARTICLE_VERSION) return null;
  const parsed = blocks.map(version < READER_ARTICLE_VERSION ? upgradeBlock : toBlock);
  if (parsed.some((block) => block === null)) return null;
  return {
    version: READER_ARTICLE_VERSION,
    title,
    author,
    publishedAt,
    minutes,
    blocks: parsed as ReaderBlock[],
  };
}
