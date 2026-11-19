import { PREVIEW_LIMITS } from './models/preview-limits.const';

const TYPE_KEY = '@type';
const GRAPH_KEY = '@graph';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function typesOf(entity: Record<string, unknown>): string[] {
  const type = entity[TYPE_KEY];
  if (typeof type === 'string') return [type];
  return Array.isArray(type) ? type.filter((name): name is string => typeof name === 'string') : [];
}

/**
 * The schema.org `@type` names of the top-level entities of JSON-LD blocks (#537): the root object,
 * the items of a root array and the members of `@graph`, never nested properties (a recipe merely
 * mentioned in an article does not make the page a recipe). The text is untrusted data: it is only
 * `JSON.parse`d (no evaluation), a block over `maxJsonLdChars` or one that does not parse is
 * skipped, and at most `maxJsonLdEntities` entities per block are looked at.
 */
export function jsonLdTypes(blocks: readonly string[]): string[] {
  const names: string[] = [];
  for (const block of blocks.slice(0, PREVIEW_LIMITS.maxJsonLdScripts)) {
    if (block.length > PREVIEW_LIMITS.maxJsonLdChars) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      continue;
    }
    const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
    let seen = 0;
    while (queue.length > 0 && seen < PREVIEW_LIMITS.maxJsonLdEntities) {
      const entity = queue.shift();
      seen++;
      if (!isRecord(entity)) continue;
      names.push(...typesOf(entity));
      const graph = entity[GRAPH_KEY];
      if (Array.isArray(graph)) queue.push(...graph.slice(0, PREVIEW_LIMITS.maxJsonLdEntities));
    }
  }
  return names;
}
