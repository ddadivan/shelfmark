import { TAG_SYNONYMS_LIMIT } from '../models/tag-synonyms-limit.const';
import { TAG_SYNONYMS_PROMPT_BLOCK } from '../models/tag-synonyms-prompt.const';
import type { TagSynonymsInput } from '../models/tag-synonyms-input.interface';

/** A tag name as plain data: control characters become spaces, every `<` becomes `&lt;`, cut. */
function clean(name: string): string {
  return name
    .replace(/\p{Cc}/gu, ' ')
    .replaceAll('<', '&lt;')
    .slice(0, TAG_SYNONYMS_LIMIT.NameMax);
}

/**
 * The user message of a tag-synonyms request: only the user's own tag names, keyed `t1…`, inside one
 * delimited block (they are user data and may hold anything). No ids, links or other content.
 */
export function buildTagSynonymsPrompt(input: TagSynonymsInput): string {
  const name = TAG_SYNONYMS_PROMPT_BLOCK.Tags;
  const lines = input.tags.map((tag) => `${tag.key}: ${clean(tag.name)}`).join('\n');
  return `<${name}>\n${lines}\n</${name}>`;
}
