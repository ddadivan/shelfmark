import type { FolderColour, FolderResponse, TagResponse } from '@shelfmark/contracts';
import type { PickerOption } from '@shelfmark/ui';
import { APP_PATH } from '../../../models/app-path.const';
import type { LinksFilter } from '../../links/models/links-filter.type';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { buildFolderPickerOptions } from '../../links/utils/folder-picker-options';
import { TAG_QUERY_PARAM } from '../../tags/models/tag-query-param.const';
import { LEFT_FEED_ID } from '../models/left-feed-id.const';
import { SPLIT_TILE_ICON } from '../models/split-tile-icon.const';
import type { LeftFeedLabels } from '../models/left-feed-labels.interface';
import type { LibraryRoute } from '../models/library-route.interface';

/** Translates a key (`TranslocoService.translate`). */
type Translate = (key: string, params?: Record<string, string>) => string;

/**
 * The options of the left half's picker: All links and Favorites, the folder tree, then the tags.
 * Unsorted is not an option here: it is the picker's `null` row.
 */
export function leftFeedOptions(
  folders: readonly FolderResponse[],
  tags: readonly TagResponse[],
  labels: LeftFeedLabels,
  shownColour: (colour: FolderColour | string) => FolderColour | string,
): PickerOption[] {
  return [
    { id: LEFT_FEED_ID.All, name: labels.all, icon: SPLIT_TILE_ICON.All },
    { id: LEFT_FEED_ID.Favorites, name: labels.favorites, icon: SPLIT_TILE_ICON.Favorites },
    ...buildFolderPickerOptions(folders, shownColour),
    ...tags.map((tag) => ({
      id: `${LEFT_FEED_ID.TagPrefix}${tag.name}`,
      name: tag.name,
      icon: SPLIT_TILE_ICON.Tag,
    })),
  ];
}

/** The option the left half shows: a folder id, `null` for Unsorted, a list or (one) tag. */
export function leftFeedId(filter: LinksFilter): string | null {
  switch (filter.scope) {
    case LINKS_SCOPE.Folder:
      return filter.folderId;
    case LINKS_SCOPE.Unsorted:
      return null;
    case LINKS_SCOPE.Favorites:
      return LEFT_FEED_ID.Favorites;
    default:
      return filter.tags?.length === 1 && !filter.q
        ? `${LEFT_FEED_ID.TagPrefix}${filter.tags[0]}`
        : LEFT_FEED_ID.All;
  }
}

/** The page a picked option opens (`null` is Unsorted). Its query is only what the option itself says. */
export function leftFeedRoute(id: string | null): LibraryRoute {
  if (id === null) {
    return { commands: ['/', APP_PATH.Unsorted], queryParams: {} };
  }
  if (id === LEFT_FEED_ID.All) {
    return { commands: ['/', APP_PATH.Links], queryParams: {} };
  }
  if (id === LEFT_FEED_ID.Favorites) {
    return { commands: ['/', APP_PATH.Favorites], queryParams: {} };
  }
  if (id.startsWith(LEFT_FEED_ID.TagPrefix)) {
    return {
      commands: ['/', APP_PATH.Links],
      queryParams: { [TAG_QUERY_PARAM]: id.slice(LEFT_FEED_ID.TagPrefix.length) },
    };
  }
  return { commands: ['/', APP_PATH.Folders, id], queryParams: {} };
}

/**
 * The name of what the left half shows: "Search: …" for a search, `#tag` for tags on all links,
 * the folder's name, or the title of the list (`library.scope.<scope>`).
 */
export function leftFeedLabel(
  filter: LinksFilter,
  folderMap: Readonly<Record<string, FolderResponse | undefined>>,
  translate: Translate,
): string {
  if (filter.q) {
    return translate('library.split.searchName', { query: filter.q });
  }
  if (filter.scope === LINKS_SCOPE.Folder) {
    return folderMap[filter.folderId]?.name ?? '';
  }
  if (filter.scope === LINKS_SCOPE.All && filter.tags && filter.tags.length > 0) {
    return filter.tags.map((tag) => `#${tag}`).join(' ');
  }
  return translate(`library.scope.${filter.scope}`);
}
