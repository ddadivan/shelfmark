import type { FolderResponse, TagResponse } from '@shelfmark/contracts';
import { splitQuery } from '../links/utils/search-query';
import { SEARCH_LOCAL_LIMIT } from './models/search-local-limit.const';
import type { FolderMatch } from './models/folder-match.interface';

function includesAll(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  return splitQuery(query).every((word) => lower.includes(word.toLowerCase()));
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
    if (path !== '' && includesAll(path, query)) {
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
  return tags.filter((tag) => includesAll(tag.name, query)).slice(0, SEARCH_LOCAL_LIMIT);
}
