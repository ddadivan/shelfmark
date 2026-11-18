import { AI_RUNNER_LIMIT } from '../models/ai-runner-limit.const';
import type { AiDbClient } from '../models/ai-db-client.type';
import type { LinkVocabulary } from '../models/link-vocabulary.interface';

const PATH_SEPARATOR = ' / ';

/**
 * The session user's own tags (most used first) and live folders (as paths, keyed `f1`, `f2`, ...)
 * for one prompt. Every query filters by `userId`, so another user's names can never appear. The
 * keys map back to ids server-side; the model never sees an id.
 */
export async function loadLinkVocabulary(db: AiDbClient, userId: string): Promise<LinkVocabulary> {
  const [tags, folders] = await Promise.all([
    db.tag.findMany({
      where: { userId },
      select: { name: true },
      orderBy: [{ links: { _count: 'desc' } }, { name: 'asc' }],
      take: AI_RUNNER_LIMIT.PromptTagsMax,
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
  const paths = folders
    .map((folder) => ({ id: folder.id, path: pathOf(folder.id) }))
    .sort((a, b) => a.path.localeCompare(b.path, 'en'))
    .slice(0, AI_RUNNER_LIMIT.PromptFoldersMax);
  const folderIdByKey = new Map<string, string>();
  const keyed = paths.map((folder, index) => {
    const key = `f${index + 1}`;
    folderIdByKey.set(key, folder.id);
    return { key, path: folder.path };
  });
  return { tags: tags.map((tag) => tag.name), folders: keyed, folderIdByKey };
}
