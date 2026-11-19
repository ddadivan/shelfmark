import { LINK_KIND } from '../links/link-kind.const';
import { SAVED_VIEW_LIMIT } from './saved-view-limit.const';
import { SAVED_VIEW_SCOPE } from './saved-view-scope.const';
import { VIEW_DRAFT_SORT } from './view-draft-sort.const';
import type { ViewDraftVocabulary } from './view-draft-vocabulary.interface';

const has = (text: string, words: readonly string[]): boolean =>
  words.some((word) => text.includes(word));

const VIDEO = ['video', 'watch', 'відео', 'vidéo', 'vídeo', 'talk'];
const ARTICLE = ['article', 'read', 'стат', 'artikel', 'articol', 'artículo', 'artigo'];
const SHOPPING = ['buy', 'shop', 'купи', 'покуп', 'acheter', 'kaufen', 'comprar', 'comprare'];
const UNSORTED = ['unsorted', 'без папки', 'не розібран'];
const FAVORITES = ['favorite', 'favourite', 'starred', 'улюблен', 'обран'];
const OLDEST = ['oldest', 'old first', 'старі спершу', 'спершу старі'];
const TITLE = ['a-z', 'by title', 'за назвою', 'alphabet'];
const NEWEST = ['newest', 'new first', 'нові спершу', 'спершу нові', 'recent'];
const WATCHED = ["haven't watched", 'not watched', 'unwatched', 'не дивився', 'unread'];

/**
 * The deterministic stand-in for the model of a view from a phrase (#535), shared by the API's mock
 * provider and the web mock so both answer the same: keywords pick the kind, Unsorted or Favorites
 * and the sort; a folder or tag of the user named in the phrase is used; `#word` asks for a tag
 * (an unknown one becomes a search word in `parseViewDraftOutput`); text in double quotes is the
 * search words; "not watched" gets the note. Answers the raw shape the real model is asked for.
 */
export function planMockViewDraft(
  phrase: string,
  vocabulary: ViewDraftVocabulary,
): Record<string, unknown> {
  const text = phrase.toLowerCase();
  const kind = has(text, VIDEO)
    ? LINK_KIND.Video
    : has(text, SHOPPING)
      ? LINK_KIND.Shopping
      : has(text, ARTICLE)
        ? LINK_KIND.Article
        : null;
  const folder =
    [...vocabulary.folders]
      .sort((a, b) => b.name.length - a.name.length)
      .find((candidate) => text.includes(candidate.name.toLowerCase()))?.name ?? null;
  const scope =
    folder !== null
      ? SAVED_VIEW_SCOPE.Folder
      : has(text, UNSORTED)
        ? SAVED_VIEW_SCOPE.Unsorted
        : has(text, FAVORITES)
          ? SAVED_VIEW_SCOPE.Favorites
          : SAVED_VIEW_SCOPE.All;
  const named = vocabulary.tags.filter((name) =>
    new RegExp(`(^|[^\\p{L}\\p{N}])${escape(name.toLowerCase())}($|[^\\p{L}\\p{N}])`, 'u').test(
      text,
    ),
  );
  const hashed = [...phrase.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map((match) => match[1] ?? '');
  const tags = [...new Set([...named, ...hashed])].filter((name) => name !== '');
  const sort = has(text, OLDEST)
    ? VIEW_DRAFT_SORT.Oldest
    : has(text, TITLE)
      ? VIEW_DRAFT_SORT.Title
      : has(text, NEWEST)
        ? VIEW_DRAFT_SORT.Newest
        : null;
  const quoted = /"([^"]+)"/u.exec(phrase)?.[1] ?? '';
  const trimmed = phrase.trim();
  const name = (trimmed.charAt(0).toUpperCase() + trimmed.slice(1)).slice(
    0,
    SAVED_VIEW_LIMIT.NameMax,
  );
  return {
    scope,
    folder,
    tags,
    kind,
    words: quoted,
    sort,
    name,
    note: has(text, WATCHED)
      ? 'Views cannot filter by what you have watched or read yet, so that part was left out.'
      : null,
  };
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
