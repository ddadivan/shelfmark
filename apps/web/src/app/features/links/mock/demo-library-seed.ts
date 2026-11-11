import type { FolderResponse, LinkResponse, PinRef } from '@shelfmark/contracts';
import { PIN_KIND } from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';
import type { DemoFolderKey } from './models/demo-folder-key.type';
import { DEMO_SEED_FOLDERS } from './models/demo-seed-folders.const';
import { DEMO_SEED_LINKS } from './models/demo-seed-links.const';

/** What the demo sandbox starts with: the folders, links and sidebar pins of the Main mockup. */
export interface DemoLibrarySeed {
  folders: FolderResponse[];
  links: LinkResponse[];
  pins: PinRef[];
}

const ID_PREFIX = '00000000-0000-4000-8000-';

/** Whether the mock session is the demo sandbox (`/demo`); specs and e2e sessions are not. */
export function isDemoMockSession(): boolean {
  try {
    const raw = globalThis.localStorage.getItem(MOCK_SESSION_STORAGE_KEY);
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      'isDemo' in parsed &&
      (parsed as { isDemo: unknown }).isDemo === true
    );
  } catch {
    return false;
  }
}

/** The demo library, dated relative to `now`; `linkCount` is derived by the mock, so 0 here. */
export function buildDemoLibrarySeed(now: number = Date.now()): DemoLibrarySeed {
  const ids = new Map<DemoFolderKey, string>(
    DEMO_SEED_FOLDERS.map((folder, index) => [folder.key, `${ID_PREFIX}${folderSuffix(index)}`]),
  );
  const stamp = new Date(now - 60 * MS_PER_DAY).toISOString();
  const folders = DEMO_SEED_FOLDERS.map((folder): FolderResponse => {
    return {
      id: ids.get(folder.key) ?? '',
      parentId: folder.parent === null ? null : (ids.get(folder.parent) ?? null),
      name: folder.name,
      colour: folder.colour,
      icon: folder.icon,
      pinned: folder.pinned === true,
      linkCount: 0,
      createdAt: stamp,
      updatedAt: stamp,
    };
  });
  const links = DEMO_SEED_LINKS.map((link, index): LinkResponse => {
    const created = new Date(now - link.daysAgo * MS_PER_DAY).toISOString();
    return {
      id: `${ID_PREFIX}${String(2000 + index).padStart(12, '0')}`,
      kind: link.kind,
      folderId: link.folder === null ? null : (ids.get(link.folder) ?? null),
      url: link.url,
      title: link.title,
      note: link.note ?? null,
      faviconUrl: null,
      imageUrl: null,
      isFavorite: link.favorite === true,
      pinnedInFolderAt: null,
      pinned: false,
      lastOpenedAt:
        link.openedDaysAgo === null
          ? null
          : new Date(now - link.openedDaysAgo * MS_PER_DAY).toISOString(),
      tags: [...link.tags],
      createdAt: created,
      updatedAt: created,
    };
  });
  links.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pins = folders
    .filter((folder) => folder.pinned)
    .map((folder): PinRef => ({ kind: PIN_KIND.Folder, id: folder.id }));
  return { folders, links, pins };
}

function folderSuffix(index: number): string {
  return `f${String(index + 1).padStart(11, '0')}`;
}
