import { createHash } from 'node:crypto';
import { AI_EMBED_LIMIT } from '../models/ai-embed-limit.const';
import type { EmbeddingTextInput } from '../models/embedding-text-input.interface';

function clean(value: string | null): string {
  return (value ?? '').replace(/\s+/gu, ' ').trim();
}

/**
 * The text embedded for a link (ADR 0051 point 2): plain lines `Title`, `Tags` (sorted, so the order
 * they were added in never changes the hash), `Summary` (AI or the user's) and `Note` only while
 * "Include my notes" is on; never the URL, folder names or other links. Empty parts are left out;
 * at most `AI_EMBED_LIMIT.TextMax` characters.
 */
export function buildEmbeddingText(link: EmbeddingTextInput, includeNotes: boolean): string {
  const tags = [...new Set(link.tagNames.map((name) => clean(name)).filter((name) => name !== ''))]
    .sort((a, b) => a.localeCompare(b, 'en'))
    .join(', ');
  const lines = [
    ['Title', clean(link.title)],
    ['Tags', tags],
    ['Summary', clean(link.summary)],
    ['Note', includeNotes ? clean(link.note) : ''],
  ]
    .filter(([, value]) => value !== '')
    .map(([label, value]) => `${label}: ${value}`);
  return Array.from(lines.join('\n')).slice(0, AI_EMBED_LIMIT.TextMax).join('');
}

/** SHA-256 (hex) of the embedded text: an unchanged text never costs a provider call. */
export function embeddingTextHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
