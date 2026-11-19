import type { FolderResponse, TagResponse, ViewDraftVocabulary } from '@shelfmark/contracts';

/** The path of a folder, `A / B`; a folder whose parent is missing counts as top level. */
function pathOf(folder: FolderResponse, byId: ReadonlyMap<string, FolderResponse>): string {
  const names = [folder.name];
  const seen = new Set([folder.id]);
  let parent = folder.parentId === null ? undefined : byId.get(folder.parentId);
  while (parent && !seen.has(parent.id)) {
    names.unshift(parent.name);
    seen.add(parent.id);
    parent = parent.parentId === null ? undefined : byId.get(parent.parentId);
  }
  return names.join(' / ');
}

/** What a phrase may point at in the mock library: its folders (with paths) and tag names. */
export function mockViewVocabulary(
  folders: readonly FolderResponse[],
  tags: readonly TagResponse[],
): ViewDraftVocabulary {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  return {
    folders: folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      path: pathOf(folder, byId),
    })),
    tags: tags.map((tag) => tag.name),
  };
}
