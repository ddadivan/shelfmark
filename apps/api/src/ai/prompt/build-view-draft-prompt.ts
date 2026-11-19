import { VIEW_DRAFT_PROMPT_BLOCK } from '../models/view-draft-prompt-block.const';
import { VIEW_DRAFT_PROMPT_LIMIT } from '../models/view-draft-prompt-limit.const';
import type { ViewDraftInput } from '../models/view-draft-input.interface';

/** User text as plain data: control characters become spaces, every `<` becomes `&lt;`, cut. */
function clean(text: string, max: number): string {
  return text
    .replace(/\p{Cc}/gu, ' ')
    .replaceAll('<', '&lt;')
    .slice(0, max);
}

function block(name: string, lines: readonly string[]): string {
  return `<${name}>\n${lines.join('\n')}\n</${name}>`;
}

/**
 * The user message of a view-from-a-phrase request: the phrase, then the user's folder paths and
 * tag names, one per line, each inside its own delimited block (all of it is user data and may hold
 * anything). No ids, links, URLs or notes.
 */
export function buildViewDraftPrompt(input: ViewDraftInput): string {
  const name = VIEW_DRAFT_PROMPT_LIMIT.NameMax;
  const folders = input.folders
    .slice(0, VIEW_DRAFT_PROMPT_LIMIT.FoldersSentMax)
    .map((path) => clean(path, name));
  const tags = input.tags
    .slice(0, VIEW_DRAFT_PROMPT_LIMIT.TagsSentMax)
    .map((tag) => clean(tag, name));
  return [
    block(VIEW_DRAFT_PROMPT_BLOCK.Phrase, [clean(input.phrase, 1000)]),
    block(VIEW_DRAFT_PROMPT_BLOCK.Folders, folders),
    block(VIEW_DRAFT_PROMPT_BLOCK.Tags, tags),
  ].join('\n\n');
}
