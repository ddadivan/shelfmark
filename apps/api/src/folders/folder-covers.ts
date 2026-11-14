import { LINK_IMAGE_KIND } from '@shelfmark/contracts';
import { imagePath } from '../links/to-link-response';
import type { FolderCover } from './models/folder-cover.interface';
import type { FolderDbClient } from './models/folder-db-client.type';

/** What a folder without a (valid) cover answers. */
export const NO_COVER: FolderCover = { coverLinkId: null, coverUrl: null };

/**
 * The covers of `folders` (#418), by folder id: a stored cover link counts only while it is one of
 * the user's live links directly in that folder (moved away, trashed or deleted shows no cover).
 * One query for all of them; folders without a valid cover are left out (`NO_COVER`).
 */
export async function loadFolderCovers(
  db: FolderDbClient,
  userId: string,
  folders: readonly { id: string; coverLinkId: string | null }[],
): Promise<Map<string, FolderCover>> {
  const wanted = folders.filter((folder) => folder.coverLinkId !== null);
  const covers = new Map<string, FolderCover>();
  if (wanted.length === 0) return covers;
  const links = await db.link.findMany({
    where: {
      userId,
      deletedAt: null,
      id: { in: wanted.map((folder) => folder.coverLinkId as string) },
    },
    select: {
      id: true,
      folderId: true,
      captureAttemptedAt: true,
      images: { where: { kind: LINK_IMAGE_KIND.Preview }, select: { kind: true, sha256: true } },
    },
  });
  const byId = new Map(links.map((link) => [link.id, link]));
  for (const folder of wanted) {
    const link = byId.get(folder.coverLinkId as string);
    if (link?.folderId === folder.id) {
      covers.set(folder.id, {
        coverLinkId: link.id,
        coverUrl: imagePath(link, LINK_IMAGE_KIND.Preview),
      });
    }
  }
  return covers;
}
