import { Service } from '@angular/core';
import type {
  FolderResponse,
  LibraryCounts,
  LinkResponse,
  TagResponse,
} from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_TAGS } from '@shelfmark/contracts/testing';
import { generateMockLinks } from './generate-mock-links';

/**
 * The one in-memory library behind the mock links, folders and tags APIs, so a folder deleted
 * through `MockFoldersApi` also disappears from `MockLinksApi` lists. Counts (`linkCount`, the
 * fixed rows) are derived from the links on every read, never stored.
 */
@Service()
export class MockLibraryData {
  links: LinkResponse[] = generateMockLinks();
  private folders: FolderResponse[] = MOCK_FOLDERS.map((folder) => ({ ...folder }));
  private tags: TagResponse[] = [
    ...MOCK_TAGS.map((tag) => ({ ...tag })),
    ...generatedTagNames(this.links, MOCK_TAGS).map((name) => newTag(name)),
  ];

  /** Stored folders without counts; mutate through `setFolders`. */
  get folderList(): readonly FolderResponse[] {
    return this.folders;
  }

  setFolders(folders: FolderResponse[]): void {
    this.folders = folders;
  }

  /** Folders with `linkCount` (links directly in the folder), ordered by name. */
  foldersView(): FolderResponse[] {
    return this.folders
      .map((folder) => ({
        ...folder,
        linkCount: this.links.filter((link) => link.folderId === folder.id).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  counts(): LibraryCounts {
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
      return { ...link, tags };
    });
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
