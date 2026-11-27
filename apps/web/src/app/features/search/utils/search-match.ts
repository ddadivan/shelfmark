import type { FolderResponse, TagResponse } from '@shelfmark/contracts';
import { searchTerms } from '@shelfmark/contracts';
import { SEARCH_LOCAL_LIMIT } from '../models/search-local-limit.const';
import type { FolderMatch } from '../models/folder-match.interface';

/** Whether `text` has every word of the query, ignoring case. */
export function includesAllWords(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  return searchTerms(query).every((word) => lower.includes(word.toLowerCase()));
}

/** The folders whose path ("Work / Angular") has every word of the query; at most `SEARCH_LOCAL_LIMIT`. */
export function matchFolders(
  folders: readonly FolderResponse[],
  pathOf: (id: string) => readonly FolderResponse[],
  query: string,
): FolderMatch[] {
  const matches: FolderMatch[] = [];
  for (const folder of folders) {
    const path = pathOf(folder.id)
      .map((part) => part.name)
      .join(' / ');
    if (path !== '' && includesAllWords(path, query)) {
      matches.push({ folder, path });
      if (matches.length === SEARCH_LOCAL_LIMIT) {
        break;
      }
    }
  }
  return matches;
}

/** The tags whose name has every word of the query; at most `SEARCH_LOCAL_LIMIT`. */
export function matchTags(tags: readonly TagResponse[], query: string): TagResponse[] {
  return tags.filter((tag) => includesAllWords(tag.name, query)).slice(0, SEARCH_LOCAL_LIMIT);
}
