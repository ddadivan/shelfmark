import { IMPORT_GROUP_NAMES_LIMIT } from '../models/import-group-names-limit.const';
import { IMPORT_GROUP_NAMES_PROMPT_BLOCK } from '../models/import-group-names-prompt.const';
import type { ImportGroupNamesInput } from '../models/import-group-names-input.interface';

/** Untrusted text as plain data: control characters become spaces, every `<` becomes `&lt;`, cut. */
function clean(text: string, max: number): string {
  return Array.from(text.replace(/\p{Cc}/gu, ' ').replaceAll('<', '&lt;'))
    .slice(0, max)
    .join('');
}

function block(name: string, body: string): string {
  return `<${name}>\n${body}\n</${name}>`;
}

/**
 * The user message of an import-group naming request: the language, the file's folder names and per
 * cluster a few titles and hosts, all inside delimited blocks as data (the titles come from a file
 * the person imported and may hold anything). No URLs beyond hosts, no ids.
 */
export function buildImportGroupNamesPrompt(input: ImportGroupNamesInput): string {
  const hints =
    input.folderNames.length > 0
      ? input.folderNames.map((name) => `- ${clean(name, IMPORT_GROUP_NAMES_LIMIT.HintMax)}`)
      : ['(none)'];
  const groups = input.groups.map((group) =>
    [
      `${group.key}:`,
      ...group.titles.map((title) => `- ${clean(title, 100)}`),
      ...(group.hosts.length > 0
        ? [`hosts: ${group.hosts.map((host) => clean(host, 80)).join(', ')}`]
        : []),
    ].join('\n'),
  );
  return [
    block(IMPORT_GROUP_NAMES_PROMPT_BLOCK.Task, `name_language: ${clean(input.language, 16)}`),
    block(IMPORT_GROUP_NAMES_PROMPT_BLOCK.Hints, hints.join('\n')),
    block(IMPORT_GROUP_NAMES_PROMPT_BLOCK.Groups, groups.join('\n\n')),
  ].join('\n\n');
}
