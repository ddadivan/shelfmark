import { Service } from '@angular/core';
import { MOCK_LINKS_SCENARIO } from '../models/mock-links-scenario.const';
import { MOCK_LINKS_SCENARIO_KEY } from '../models/mock-links-scenario-key.const';
import {
  FOLDER_DELETE_MODE,
  PIN_KIND,
  TRASH_ITEM_KIND,
  TRASH_RETENTION_DEFAULT,
  type FolderDeleteMode,
  type FolderResponse,
  type LibraryCounts,
  type LibrarySettings,
  type LinkResponse,
  type LinkSuggestion,
  type ListLinksQuery,
  type ListPinsResponse,
  type PinKind,
  type PinRef,
  type PinResponse,
  type TagResponse,
  type TrashRetentionDays,
  type FolderEmoji,
  type HexColour,
  findMatchingRule,
} from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_TAGS } from '@shelfmark/contracts/testing';
import type { MockTrashEntry } from '../../trash/mock/models/mock-trash-entry.interface';
import { MOCK_TRASH_SCENARIO } from '../../trash/mock/models/mock-trash-scenario.const';
import { MOCK_TRASH_SCENARIO_KEY } from '../../trash/mock/models/mock-trash-scenario-key.const';
import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';
import { matchesQuery } from '../utils/search-query';
import { buildDemoLibrarySeed, usesDemoLibrary } from './demo-library-seed';
import { generateMockLinks } from './generate-mock-links';
import { withMockPreviews } from './with-mock-previews';
import type { MockSavedView } from '../../views/mock/models/mock-saved-view.interface';
import { mockStarterViews } from '../../views/mock/mock-starter-views';
import type { MockRule } from '../../rules/mock/models/mock-rule.interface';
import type { MockRuleEffect } from '../../rules/mock/models/mock-rule-effect.interface';
import {
  readMockLibrarySettings,
  writeMockLibrarySettings,
} from '../../settings/mock/read-mock-library-settings';

const SEEDED_OLD_LINKS = 2;

/** `localStorage`, or `undefined` where it is missing or blocked (a spec without a DOM). */
function mockStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
const SEEDED_OLD_DAYS = 20;

/** The `empty` links scenario (`sm-mock-links-scenario`): a new account with nothing saved. */
function emptyLinksScenario(): boolean {
  try {
    return globalThis.sessionStorage.getItem(MOCK_LINKS_SCENARIO_KEY) === MOCK_LINKS_SCENARIO.Empty;
  } catch {
    return false;
  }
}

/**
 * The one in-memory library behind the mock links, folders and tags APIs, so a folder deleted
 * through `MockFoldersApi` also disappears from `MockLinksApi` lists. Counts (`linkCount`, the
 * fixed rows) are derived from the links on every read, never stored. Deleted links and folders
 * wait in `trash` (the mock Trash and the mock settings read it); the retention is the mock
 * account setting.
 */
@Service()
export class MockLibraryData {
  /**
   * The demo sandbox (and the `showcase` scenario) starts from the mockup library; every other
   * mock session from the fixtures.
   */
  private readonly demo = usesDemoLibrary() ? buildDemoLibrarySeed() : null;
  links: LinkResponse[] = withMockPreviews(this.demo?.links ?? generateMockLinks());
  private folders: FolderResponse[] =
    this.demo?.folders ?? MOCK_FOLDERS.map((folder) => ({ ...folder }));
  private tags: TagResponse[] = [
    ...(this.demo ? [] : MOCK_TAGS.map((tag) => ({ ...tag }))),
    ...generatedTagNames(this.links, this.demo ? [] : MOCK_TAGS).map((name) => newTag(name)),
  ];

  /** The links each mock import created, by import id (the Tidy review of one import reads it). */
  readonly importLinkIds = new Map<string, ReadonlySet<string>>();

  /** The mock Trash, newest first. */
  trash: MockTrashEntry[] = this.seedTrash();
  /** The mock account setting "Keep deleted items for". */
  trashRetentionDays: TrashRetentionDays = TRASH_RETENTION_DEFAULT;
  /** The mock account setting "Folder colours". */
  folderColours = true;
  /** Own colours (#335), in the order they were added. */
  customColours: HexColour[] = [];
  /** Own emoji (#363), in the order they were added. */
  customEmoji: FolderEmoji[] = [];
  /** The mock account setting "Pause history": while on, the mock open records nothing. */
  pauseHistory = false;
  /** The sidebar pins in order (folders and links together). */
  pins: PinRef[] = this.demo?.pins ?? [];
  /** The saved views in order; a new account starts with the starter views. */
  views: MockSavedView[] = mockStarterViews();
  /** The domain rules (#398); the demo starts with one example. */
  rules: MockRule[] = this.demo?.rules ?? [];
  /** Domains the user answered "Not now" for in a rule offer (AI-2); rules data, not AI data. */
  ruleOfferDismissals: string[] = [];
  /** AI suggestions the demo starts with, per link id (read once by the mock AI). */
  readonly demoSuggestions: ReadonlyMap<string, LinkSuggestion[]> =
    this.demo?.suggestions ?? new Map();

  /** Stored folders without counts; mutate through `setFolders`. */
  /**
   * The mock account's Settings › Library choices, kept in `localStorage` so a reload sees them
   * like the server's. Like the API, "New links go to" reads as Unsorted once its folder is gone.
   */
  get library(): LibrarySettings {
    const settings = readMockLibrarySettings(mockStorage());
    const id = settings.newLinksFolderId;
    return id !== null && !this.folders.some((folder) => folder.id === id)
      ? { ...settings, newLinksFolderId: null }
      : settings;
  }

  set library(settings: LibrarySettings) {
    writeMockLibrarySettings(mockStorage(), settings);
  }

  get folderList(): readonly FolderResponse[] {
    return this.folders;
  }

  setFolders(folders: FolderResponse[]): void {
    this.folders = folders;
  }

  /** The place after the last subfolder of `parentId` (a new or moved folder goes last). */
  nextFolderPosition(parentId: string | null): number {
    return (
      this.folders
        .filter((folder) => folder.parentId === parentId)
        .reduce((max, folder) => Math.max(max, folder.position), -1) + 1
    );
  }

  /**
   * Folders with `linkCount` (links directly in the folder) and the cover (#418: only while the
   * cover link is still a live link of that folder, like the API), by position, then name.
   */
  foldersView(): FolderResponse[] {
    return this.folders
      .map((folder) => {
        const cover = this.links.find(
          (link) => link.id === folder.coverLinkId && link.folderId === folder.id,
        );
        return {
          ...folder,
          coverLinkId: cover?.id ?? null,
          coverUrl: cover?.imageUrl ?? null,
          pinned: this.isPinned(PIN_KIND.Folder, folder.id),
          linkCount: this.links.filter((link) => link.folderId === folder.id).length,
        };
      })
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  }

  isPinned(kind: PinKind, id: string): boolean {
    return this.pins.some((pin) => pin.kind === kind && pin.id === id);
  }

  /** A copy of the link with the sidebar pin flag applied. */
  linkView(link: LinkResponse): LinkResponse {
    return { ...link, pinned: this.isPinned(PIN_KIND.Link, link.id) };
  }

  /** The pins as the API answers them. */
  pinsView(): ListPinsResponse {
    const folders = this.foldersView();
    return {
      items: this.pins.flatMap((pin, position): PinResponse[] => {
        if (pin.kind === PIN_KIND.Folder) {
          const folder = folders.find((item) => item.id === pin.id);
          return folder ? [{ kind: pin.kind, position, folder, link: null }] : [];
        }
        const link = this.links.find((item) => item.id === pin.id);
        return link ? [{ kind: pin.kind, position, folder: null, link: this.linkView(link) }] : [];
      }),
    };
  }

  /** Pin writes and Trash drop pins of items that are gone. */
  unpin(kind: PinKind, ids: readonly string[]): void {
    this.pins = this.pins.filter((pin) => pin.kind !== kind || !ids.includes(pin.id));
  }

  /** The links a list query matches (the filters of `GET /api/links`, no sort, no paging). */
  matching(query: ListLinksQuery): LinkResponse[] {
    const wanted = (query.tag ?? []).map((name) => name.toLowerCase());
    return this.links.filter(
      (link) =>
        (query.folderId === undefined || link.folderId === query.folderId) &&
        (!query.unsorted || link.folderId === null) &&
        (query.favorite === undefined || link.isFavorite === query.favorite) &&
        (query.kind === undefined || link.kind === query.kind) &&
        wanted.every((tag) => link.tags.some((name) => name.toLowerCase() === tag)) &&
        (query.q === undefined || matchesQuery(link, query.q)),
    );
  }

  counts(): LibraryCounts {
    if (emptyLinksScenario()) {
      // The `empty` links scenario lists nothing: the sidebar counts agree (a new account).
      return { all: 0, unsorted: 0, favorites: 0 };
    }
    return {
      all: this.links.length,
      unsorted: this.links.filter((link) => link.folderId === null).length,
      favorites: this.links.filter((link) => link.isFavorite).length,
    };
  }

  /** Stored tags without counts; mutate through `setTags`. */
  get tagList(): readonly TagResponse[] {
    return this.tags;
  }

  setTags(tags: TagResponse[]): void {
    this.tags = tags;
  }

  /** Tags with `linkCount`, most used first, then by name (the API order). */
  tagsView(): TagResponse[] {
    return this.tags
      .map((tag) => ({
        ...tag,
        linkCount: this.links.filter((link) => link.tags.includes(tag.name)).length,
      }))
      .sort((a, b) => b.linkCount - a.linkCount || a.name.localeCompare(b.name));
  }

  /** Makes sure every name exists as a tag (a link was saved with a new one). */
  ensureTags(names: readonly string[]): void {
    for (const name of names) {
      if (!this.tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())) {
        this.tags = [...this.tags, newTag(name)];
      }
    }
  }

  /** Rewrites the tag names of every link; a name that maps to `null` is dropped, duplicates collapse. */
  retagLinks(map: (name: string) => string | null): void {
    this.links = this.links.map((link) => {
      const seen = new Set<string>();
      const tags: string[] = [];
      for (const name of link.tags) {
        const next = map(name);
        if (next !== null && !seen.has(next.toLowerCase())) {
          seen.add(next.toLowerCase());
          tags.push(next);
        }
      }
      return { ...link, tags: tags.sort((a, b) => a.localeCompare(b, 'en')) };
    });
  }

  /** The `old-items` scenario: two links deleted 20 days ago; otherwise an empty Trash. */
  private seedTrash(): MockTrashEntry[] {
    let scenario: string | null = null;
    try {
      scenario = globalThis.sessionStorage.getItem(MOCK_TRASH_SCENARIO_KEY);
    } catch {
      // No sessionStorage (a spec without a DOM): an empty Trash.
    }
    if (scenario !== MOCK_TRASH_SCENARIO.OldItems) {
      return [];
    }
    const old = this.links.splice(0, SEEDED_OLD_LINKS);
    return old.map((link, index) => ({
      kind: TRASH_ITEM_KIND.Link,
      id: link.id,
      deletedAt: new Date(Date.now() - SEEDED_OLD_DAYS * MS_PER_DAY - index * 1000).toISOString(),
      fromFolderName: null,
      link: { ...link, folderId: null },
      folders: [],
      links: [],
    }));
  }

  /** Moves a link to Trash. */
  trashLink(link: LinkResponse): void {
    this.links = this.links.filter((item) => item.id !== link.id);
    this.unpin(PIN_KIND.Link, [link.id]);
    const stored = unpinned(link);
    this.trash = [
      {
        kind: TRASH_ITEM_KIND.Link,
        id: link.id,
        deletedAt: new Date().toISOString(),
        fromFolderName: this.folderName(link.folderId),
        link: stored,
        folders: [],
        links: [],
      },
      ...this.trash,
    ];
  }

  /**
   * Deletes a folder and its subfolders: one Trash entry. `delete-links` takes the links inside
   * along into the entry, `move-to-unsorted` moves them out to Unsorted first.
   */
  trashFolder(id: string, mode: FolderDeleteMode): void {
    const ids = new Set(this.subtreeIds(id));
    const inTree = (folderId: string | null): boolean => folderId !== null && ids.has(folderId);
    const root = this.folders.find((folder) => folder.id === id);
    if (!root) {
      return;
    }
    const folders = [
      root,
      ...this.folders.filter((folder) => ids.has(folder.id) && folder !== root),
    ];
    const withLinks = mode === FOLDER_DELETE_MODE.DeleteLinks;
    this.unpin(PIN_KIND.Folder, [...ids]);
    const links = withLinks ? this.links.filter((link) => inTree(link.folderId)).map(unpinned) : [];
    this.links = withLinks
      ? this.links.filter((link) => !inTree(link.folderId))
      : this.links.map((link) =>
          inTree(link.folderId) ? { ...link, folderId: null, pinnedInFolderAt: null } : link,
        );
    this.folders = this.folders.filter((folder) => !ids.has(folder.id));
    this.trash = [
      {
        kind: TRASH_ITEM_KIND.Folder,
        id,
        deletedAt: new Date().toISOString(),
        fromFolderName: this.folderName(root.parentId),
        link: null,
        folders,
        links,
      },
      ...this.trash,
    ];
  }

  /**
   * The folder a rule refers to, like the API's `ON DELETE SET NULL`: kept while the folder is
   * live or in Trash, `null` once it is deleted for good.
   */
  ruleFolderId(rule: MockRule): string | null {
    const id = rule.folderId;
    const known =
      id !== null &&
      (this.folders.some((folder) => folder.id === id) ||
        this.trash.some((entry) => entry.folders.some((folder) => folder.id === id)));
    return known ? id : null;
  }

  /**
   * What the domain rule of `url` does to a link being saved (#398), like the API's matcher: the
   * most specific domain wins; its folder only while it is live, its tags always.
   */
  ruleEffect(url: string): MockRuleEffect | null {
    const rule = findMatchingRule(this.rules, url);
    if (rule === null) {
      return null;
    }
    const live =
      rule.folderId !== null && this.folders.some((folder) => folder.id === rule.folderId);
    return { folderId: live ? rule.folderId : null, tags: [...rule.tags] };
  }

  /** Name of the live folder `id`, or `null` (Unsorted, the top level, or a folder that is gone). */
  folderName(id: string | null): string | null {
    return id === null ? null : (this.folders.find((folder) => folder.id === id)?.name ?? null);
  }

  /** `id` and every descendant of it. */
  subtreeIds(id: string): string[] {
    const ids = [id];
    for (const current of ids) {
      for (const folder of this.folders) {
        if (folder.parentId === current && !ids.includes(folder.id)) {
          ids.push(folder.id);
        }
      }
    }
    return ids;
  }
}

function unpinned(link: LinkResponse): LinkResponse {
  return { ...link, pinnedInFolderAt: null };
}

function generatedTagNames(
  links: readonly LinkResponse[],
  known: ReadonlyArray<Readonly<TagResponse>>,
): string[] {
  const names = new Set(links.flatMap((link) => link.tags));
  for (const tag of known) {
    names.delete(tag.name);
  }
  return [...names];
}

function newTag(name: string): TagResponse {
  const now = new Date().toISOString();
  return { id: globalThis.crypto.randomUUID(), name, linkCount: 0, createdAt: now, updatedAt: now };
}
