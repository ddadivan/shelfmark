import type { ViewDraftVocabulary } from '@shelfmark/contracts';
import type { AiDbClient } from '../models/ai-db-client.type';
import { VIEW_DRAFT_PROMPT_LIMIT } from '../models/view-draft-prompt-limit.const';

const PATH_SEPARATOR = ' / ';

/**
 * The session user's live folders (with paths, by path) and tag names (most used first) that a phrase
 * may point at (#535). Every query filters by `userId`, so another user's names can never appear in
 * the prompt or be mapped back.
 */
export async function loadViewDraftVocabulary(
  db: AiDbClient,
  userId: string,
): Promise<ViewDraftVocabulary> {
  const [tags, folders] = await Promise.all([
    db.tag.findMany({
      where: { userId },
      select: { name: true },
      orderBy: [{ links: { _count: 'desc' } }, { name: 'asc' }],
      take: VIEW_DRAFT_PROMPT_LIMIT.TagsSentMax,
    }),
    db.folder.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, parentId: true, name: true },
    }),
  ]);
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const pathOf = (id: string): string => {
    const names: string[] = [];
    const seen = new Set<string>();
    let current = byId.get(id);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    return names.join(PATH_SEPARATOR);
  };
  return {
    folders: folders
      .map((folder) => ({ id: folder.id, name: folder.name, path: pathOf(folder.id) }))
      .sort((a, b) => a.path.localeCompare(b.path, 'en'))
      .slice(0, VIEW_DRAFT_PROMPT_LIMIT.FoldersSentMax),
    tags: tags.map((tag) => tag.name),
  };
}
