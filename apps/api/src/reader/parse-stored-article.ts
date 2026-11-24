import {
  READER_BLOCK_KIND,
  type ReaderArticle,
  type ReaderBlock,
  type ReaderBlockKind,
} from '@shelfmark/contracts';

const KINDS: readonly string[] = Object.values(READER_BLOCK_KIND);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toBlock(value: unknown): ReaderBlock | null {
  if (!isRecord(value)) return null;
  const { kind, text, items } = value;
  if (typeof kind !== 'string' || !KINDS.includes(kind) || typeof text !== 'string') return null;
  if (!Array.isArray(items) || !items.every((item) => typeof item === 'string')) return null;
  // Image blocks are never stored with a URL (no remote image reaches the client).
  return { kind: kind as ReaderBlockKind, text, items: items as string[], imageUrl: null };
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' ? value : undefined;
}

/**
 * Reads a stored `link_reader_articles.article` back into the contract shape. Anything that does
 * not match (a hand edit, an older shape) is `null`, so the caller extracts again.
 */
export function parseStoredArticle(value: unknown): ReaderArticle | null {
  if (!isRecord(value)) return null;
  const { title, minutes, blocks } = value;
  const author = nullableString(value['author']);
  const publishedAt = nullableString(value['publishedAt']);
  if (typeof title !== 'string' || author === undefined || publishedAt === undefined) return null;
  if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1) return null;
  if (!Array.isArray(blocks)) return null;
  const parsed = blocks.map(toBlock);
  if (parsed.some((block) => block === null)) return null;
  return { title, author, publishedAt, minutes, blocks: parsed as ReaderBlock[] };
}
