import { LINK_PROMPT_BLOCK } from '../models/link-prompt.const';
import type { LinkJobInput } from '../models/link-job-input.interface';

/**
 * Untrusted text goes into delimited blocks as plain data. Every `<` becomes `&lt;`, so no page,
 * title or note can close a block or open one of ours, and control characters (except a newline in
 * the multi-line blocks) become spaces.
 */
function clean(text: string, multiline: boolean): string {
  return text
    .replace(/\p{Cc}/gu, (char) => (multiline && char === '\n' ? char : ' '))
    .replaceAll('<', '&lt;');
}

function block(name: string, body: string): string {
  return `<${name}>\n${body}\n</${name}>`;
}

/**
 * The user message of a link job: the task, the user's own vocabulary and the page as untrusted data.
 * Folders appear as short keys only (`f1: Work / Design`), never ids. Earlier choices for the same
 * site (AI-2) follow the vocabulary as folder keys and the user's own tag names, nothing else. The note is included only when
 * the input carries one (the switch "Include my notes" decides before the input is built).
 */
export function buildLinkUserPrompt(input: LinkJobInput): string {
  const blocks = [
    block(
      LINK_PROMPT_BLOCK.Task,
      [
        `parts: ${input.parts.join(', ')}`,
        `summary_language: ${clean(input.language, false)}`,
      ].join('\n'),
    ),
    block(
      LINK_PROMPT_BLOCK.Tags,
      input.tags.length > 0
        ? input.tags.map((tag) => `- ${clean(tag, false)}`).join('\n')
        : '(none)',
    ),
    block(
      LINK_PROMPT_BLOCK.Folders,
      input.folders.length > 0
        ? input.folders.map((folder) => `${folder.key}: ${clean(folder.path, false)}`).join('\n')
        : '(none)',
    ),
    ...(input.examples.length > 0
      ? [
          block(
            LINK_PROMPT_BLOCK.Examples,
            input.examples
              .map(
                (example) =>
                  `- folder: ${example.folderKey ?? '(none)'}; tags: ${
                    example.tags.length > 0
                      ? example.tags.map((tag) => clean(tag, false)).join(', ')
                      : '(none)'
                  }`,
              )
              .join('\n'),
          ),
        ]
      : []),
    block(
      LINK_PROMPT_BLOCK.Link,
      [
        `url: ${clean(input.url, false)}`,
        input.title ? `title: ${clean(input.title, false)}` : null,
        input.description ? `description: ${clean(input.description, false)}` : null,
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
    ),
  ];
  if (input.note) blocks.push(block(LINK_PROMPT_BLOCK.Note, clean(input.note, true)));
  blocks.push(
    block(
      LINK_PROMPT_BLOCK.Page,
      input.excerpt ? clean(input.excerpt, true) : '(page text unavailable)',
    ),
  );
  return blocks.join('\n\n');
}
