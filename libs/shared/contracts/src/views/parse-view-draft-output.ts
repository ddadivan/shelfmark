import type { LinkKind } from '../links/link-kind.type';
import { LINK_LIMIT } from '../links/link-limit.const';
import { LINK_SORT_FIELD } from '../links/link-sort-field.const';
import { SORT_ORDER } from '../pagination/sort-order.const';
import { normalizeTagName } from '../tags/normalize-tag-name';
import { SAVED_VIEW_LIMIT } from './saved-view-limit.const';
import { SAVED_VIEW_SCOPE } from './saved-view-scope.const';
import type { SavedViewQuery } from './saved-view-query.interface';
import type { SavedViewScope } from './saved-view-scope.type';
import { VIEW_DRAFT_FIELD } from './view-draft-field.const';
import type { ViewDraftField } from './view-draft-field.type';
import { VIEW_DRAFT_LIMIT } from './view-draft-limit.const';
import { VIEW_DRAFT_SORT } from './view-draft-sort.const';
import { VIEW_DRAFT_KINDS } from './view-draft-kinds.const';
import type { ViewDraftVocabulary } from './view-draft-vocabulary.interface';
import type { ViewDraft } from './view-draft.interface';

const CONTROL_CHARS = /\p{Cc}/gu;
// `<[^<>]*>`, not `<[^>]*>`: a run of `<` cannot make it backtrack (linear time; CodeQL ReDoS).
const HTML_TAG = /<[^<>]*>/g;
/** How much of a model string is read at all: a few times the longest field, before any regex. */
const READ_FACTOR = 4;
/** Kinds a phrase may ask for; `other` is not one of them, so it reads as "every kind". */
const KINDS: readonly string[] = VIEW_DRAFT_KINDS;
const SCOPES: readonly string[] = Object.values(SAVED_VIEW_SCOPE);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLinkKind = (value: string): value is LinkKind => KINDS.includes(value);
const isScope = (value: string): value is SavedViewScope => SCOPES.includes(value);

/** Plain one-line text: markup and control characters removed, whitespace collapsed, cut to `max`. */
function plain(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = value
    .slice(0, max * READ_FACTOR)
    .replace(HTML_TAG, ' ')
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max).trim() : text;
}

function sortOf(value: unknown): Pick<SavedViewQuery, 'sort' | 'order'> | null {
  if (value === VIEW_DRAFT_SORT.Newest) {
    return { sort: LINK_SORT_FIELD.CreatedAt, order: SORT_ORDER.Desc };
  }
  if (value === VIEW_DRAFT_SORT.Oldest) {
    return { sort: LINK_SORT_FIELD.CreatedAt, order: SORT_ORDER.Asc };
  }
  if (value === VIEW_DRAFT_SORT.Title) {
    return { sort: LINK_SORT_FIELD.Title, order: SORT_ORDER.Asc };
  }
  return null;
}

/** The user's folder named `name`: by its path first, then by its own name (the first one wins). */
function findFolder(name: string, vocabulary: ViewDraftVocabulary): string | null {
  const wanted = name.toLowerCase();
  const byPath = vocabulary.folders.find((folder) => folder.path.toLowerCase() === wanted);
  const byName = vocabulary.folders.find((folder) => folder.name.toLowerCase() === wanted);
  return (byPath ?? byName)?.id ?? null;
}

/**
 * Narrows the model's answer for a view from a phrase (never trusted, #535). `null` when it is not an
 * object (the request is `unavailable`). Otherwise only what a view can store survives:
 * - a folder only when its name or path is one of the user's live folders; an unknown folder becomes
 *   search words and the view starts from all links;
 * - tags only from the user's own names (as the user spelled them), at most `SAVED_VIEW_LIMIT.TagsMax`
 *   (the rest go to `dropped`); an unknown tag becomes a search word;
 * - a kind only one of `VIEW_DRAFT_KINDS` (never `other`); a sort only one of the feed's three;
 * - search words as plain text, at most `LINK_LIMIT.QueryTermsMax` words (the rest go to `dropped`);
 * - a plain-text name (else the phrase) and an optional plain-text note.
 * Nothing is ever created: no tag, no folder.
 */
export function parseViewDraftOutput(
  raw: unknown,
  vocabulary: ViewDraftVocabulary,
  phrase: string,
): ViewDraft | null {
  if (!isRecord(raw)) return null;
  const set: ViewDraftField[] = [];
  const dropped: string[] = [];
  const words: string[] = [];
  const addWords = (text: string): void => {
    for (const word of plain(text, LINK_LIMIT.QueryMax).split(' ')) {
      if (word !== '' && !words.some((have) => have.toLowerCase() === word.toLowerCase())) {
        words.push(word);
      }
    }
  };

  let scope: SavedViewScope =
    typeof raw['scope'] === 'string' && isScope(raw['scope']) ? raw['scope'] : SAVED_VIEW_SCOPE.All;
  let folderId: string | null = null;
  const folderName = plain(raw['folder'], LINK_LIMIT.QueryMax);
  if (scope === SAVED_VIEW_SCOPE.Folder || (scope === SAVED_VIEW_SCOPE.All && folderName !== '')) {
    folderId = folderName === '' ? null : findFolder(folderName, vocabulary);
    if (folderId !== null) {
      scope = SAVED_VIEW_SCOPE.Folder;
    } else {
      scope = SAVED_VIEW_SCOPE.All;
      addWords(folderName);
    }
  }
  if (scope !== SAVED_VIEW_SCOPE.All) set.push(VIEW_DRAFT_FIELD.Scope);

  const own = new Map(vocabulary.tags.map((name) => [name.toLowerCase(), name]));
  const tags: string[] = [];
  for (const value of Array.isArray(raw['tags']) ? (raw['tags'] as unknown[]) : []) {
    const name = normalizeTagName(plain(value, LINK_LIMIT.QueryMax));
    if (name === '') continue;
    const match = own.get(name.toLowerCase());
    if (match === undefined) {
      addWords(name.replace(/-/g, ' '));
    } else if (!tags.includes(match)) {
      if (tags.length < SAVED_VIEW_LIMIT.TagsMax) tags.push(match);
      else dropped.push(match);
    }
  }
  if (tags.length > 0) set.push(VIEW_DRAFT_FIELD.Tags);

  const kindValue = raw['kind'];
  const kind = typeof kindValue === 'string' && isLinkKind(kindValue) ? kindValue : null;
  if (kind !== null) set.push(VIEW_DRAFT_FIELD.Kind);

  addWords(typeof raw['words'] === 'string' ? raw['words'] : '');
  const kept = words.slice(0, LINK_LIMIT.QueryTermsMax);
  dropped.push(...words.slice(LINK_LIMIT.QueryTermsMax));
  const q = kept.join(' ').slice(0, LINK_LIMIT.QueryMax).trim();
  if (q !== '') set.push(VIEW_DRAFT_FIELD.Q);

  const sort = sortOf(raw['sort']);
  if (sort !== null) set.push(VIEW_DRAFT_FIELD.Sort);

  const name =
    plain(raw['name'], SAVED_VIEW_LIMIT.NameMax) || plain(phrase, SAVED_VIEW_LIMIT.NameMax);
  const note = plain(raw['note'], VIEW_DRAFT_LIMIT.NoteMax);
  return {
    query: {
      scope,
      folderId,
      tags,
      kind,
      sort: sort?.sort ?? LINK_SORT_FIELD.CreatedAt,
      order: sort?.order ?? SORT_ORDER.Desc,
      q,
      // The draft never sets a period or favorites-only: the person picks those rows.
      saved: null,
      favorite: false,
    },
    set,
    name,
    note: note === '' ? null : note,
    dropped,
  };
}
