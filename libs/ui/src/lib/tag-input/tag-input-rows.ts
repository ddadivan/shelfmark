import type { TagInputRow } from './models/tag-input-row.interface';
import type { TagSuggestion } from './models/tag-suggestion.interface';
import { TAG_MAX_LENGTH } from './models/tag-max-length.const';
import { TAG_SUGGESTION_LIMIT } from './models/tag-suggestion-limit.const';

const ROW_KEY_TAG = 'tag:';
const ROW_KEY_CREATE = 'create:';

/** Trims the text and cuts it to the tag length limit. */
export function normalizeTag(text: string, max = TAG_MAX_LENGTH): string {
  return text.trim().slice(0, max).trim();
}

/** Whether the list has the tag already; tags are compared ignoring case. */
export function includesTag(tags: readonly string[], name: string): boolean {
  const wanted = name.toLocaleLowerCase();
  return tags.some((tag) => tag.toLocaleLowerCase() === wanted);
}

/** Puts the tag name into a translated template such as `Remove tag {name}`. */
export function fillName(template: string, name: string): string {
  return template.replaceAll('{name}', () => name);
}

/**
 * The suggestion list for the typed text: existing tags that are not added yet and contain the
 * text (those that start with it first), then a "Create tag" row when the text is a new tag.
 * Nothing is offered at the tag limit, and no create row without its label.
 */
export function tagRows(
  suggestions: readonly TagSuggestion[],
  tags: readonly string[],
  query: string,
  atLimit: boolean,
  createLabel: string,
): TagInputRow[] {
  if (atLimit) {
    return [];
  }
  const text = normalizeTag(query);
  if (query && !text) {
    // Only blanks typed: nothing to look for yet.
    return [];
  }
  const needle = text.toLocaleLowerCase();
  const matches = suggestions.filter(
    (s) => !includesTag(tags, s.name) && s.name.toLocaleLowerCase().includes(needle),
  );
  const starting = matches.filter((s) => s.name.toLocaleLowerCase().startsWith(needle));
  const rest = matches.filter((s) => !starting.includes(s));
  const rows: TagInputRow[] = [...starting, ...rest].slice(0, TAG_SUGGESTION_LIMIT).map((s) => ({
    key: ROW_KEY_TAG + s.name,
    name: s.name,
    label: s.name,
    create: false,
    countLabel: s.countLabel,
  }));
  const known = includesTag(tags, text) || suggestions.some((s) => includesTag([s.name], text));
  if (text && !known && createLabel) {
    rows.push({
      key: ROW_KEY_CREATE + text,
      name: text,
      label: fillName(createLabel, text),
      create: true,
    });
  }
  return rows;
}
