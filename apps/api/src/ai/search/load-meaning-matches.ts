import type { MeaningMatch } from '@shelfmark/contracts';
import { LINK_INCLUDE } from '../../links/models/link-include.const';
import { toLinkResponse } from '../../links/to-link-response';
import type { PrismaService } from '../../prisma/prisma.service';
import type { WhySource } from '../models/why-source.interface';

/**
 * The user's live links for `ids` in that order, each with its tag names, folder name and summary
 * (folders only when live and the user's), turned into `MeaningMatch`es by `why`.
 */
export async function loadMeaningMatches(
  prisma: PrismaService,
  userId: string,
  ids: readonly string[],
  why: (source: WhySource & { folderId: string | null }) => MeaningMatch['why'],
): Promise<MeaningMatch[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.link.findMany({
    where: { userId, deletedAt: null, id: { in: [...ids] } },
    include: LINK_INCLUDE,
  });
  const folderIds = [...new Set(rows.flatMap((row) => (row.folderId ? [row.folderId] : [])))];
  const folders =
    folderIds.length === 0
      ? []
      : await prisma.folder.findMany({
          where: { userId, deletedAt: null, id: { in: folderIds } },
          select: { id: true, name: true },
        });
  const folderName = new Map(folders.map((folder) => [folder.id, folder.name]));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    if (row === undefined) return [];
    const source = {
      tagNames: row.tags.map((entry) => entry.tag.name),
      folderName: row.folderId === null ? null : (folderName.get(row.folderId) ?? null),
      summary: row.summary,
      folderId: row.folderId,
    };
    return [{ link: toLinkResponse(row), why: why(source) }];
  });
}
