import { ASK_PROMPT_BLOCK } from '../models/ask-prompt.const';
import { ASK_PROMPT_LIMIT } from '../models/ask-prompt-limit.const';
import type { AskInput } from '../models/ask-input.interface';
import type { AskPromptSource } from '../models/ask-prompt-source.interface';

/**
 * Untrusted text as plain data: control characters become spaces (a newline survives only in the
 * note), every `<` becomes `&lt;` so nothing can close a block or open one of ours (as
 * `buildLinkUserPrompt`), then the field is cut to its cap.
 */
function clean(text: string, max: number, multiline = false): string {
  const cleaned = text
    .replace(/\p{Cc}/gu, (char) => (multiline && char === '\n' ? char : ' '))
    .replaceAll('<', '&lt;')
    .trim();
  return Array.from(cleaned).slice(0, max).join('');
}

function savedMonth(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function sourceBlock(source: AskPromptSource, includeNotes: boolean): string {
  // Never a query string or fragment, even if the caller passed one.
  const path = source.path.split(/[?#]/u)[0] ?? '';
  const lines = [
    `title: ${clean(source.title, ASK_PROMPT_LIMIT.TitleMax)}`,
    `site: ${clean(`${source.host}${path === '/' ? '' : path}`, ASK_PROMPT_LIMIT.SiteMax)}`,
    source.folderName === null
      ? null
      : `folder: ${clean(source.folderName, ASK_PROMPT_LIMIT.FolderMax)}`,
    source.tagNames.length === 0
      ? null
      : `tags: ${source.tagNames
          .slice(0, ASK_PROMPT_LIMIT.TagsMax)
          .map((name) => clean(name, ASK_PROMPT_LIMIT.FolderMax))
          .join(', ')}`,
    source.summary === null
      ? null
      : `summary: ${clean(source.summary, ASK_PROMPT_LIMIT.SummaryMax)}`,
    `saved: ${savedMonth(source.savedAt)}`,
    includeNotes && source.note !== null && source.note.trim() !== ''
      ? `note: ${clean(source.note, ASK_PROMPT_LIMIT.NoteMax, true)}`
      : null,
  ].filter((line): line is string => line !== null);
  return `<${ASK_PROMPT_BLOCK.Source} n="${source.n}">\n${lines.join('\n')}\n</${ASK_PROMPT_BLOCK.Source}>`;
}

/**
 * The user message of an Ask answer (ADR 0051 point 4): the numbered sources as delimited data, then
 * the question. Only stored fields of the user's own retrieved links; the note only with "Include my
 * notes"; never ids, query strings or page text.
 */
export function buildAskUserPrompt(input: AskInput): string {
  const sources = input.sources.map((source) => sourceBlock(source, input.includeNotes));
  return [
    `<${ASK_PROMPT_BLOCK.Sources}>\n${sources.join('\n')}\n</${ASK_PROMPT_BLOCK.Sources}>`,
    `<${ASK_PROMPT_BLOCK.Question}>\n${clean(input.question, Number.MAX_SAFE_INTEGER)}\n</${ASK_PROMPT_BLOCK.Question}>`,
  ].join('\n\n');
}
