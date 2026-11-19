import { loadFolderPaths } from '../../../mcp/tools/folder-tree';
import type { PrismaService } from '../../../prisma/prisma.service';
import { ASK_LINK_SELECT } from '../../models/ask-link-select.const';
import type { AskLinkRow } from '../../models/ask-link-row.type';
import type { AskMatch } from '../../models/ask-match.type';
import type { AskToolContext } from '../../models/ask-tool-context.interface';
import type { AskToolLink } from '../../models/ask-tool-link.interface';
import { toAskToolLink } from './to-ask-tool-link';

/**
 * The session user's live links with these ids, in the given order, as the model sees them, each
 * with its ref (assigned here on first sight). Ids of other users, trashed or missing links drop out.
 */
export async function loadAskLinks(
  prisma: PrismaService,
  context: AskToolContext,
  ordered: readonly { id: string; match?: AskMatch }[],
): Promise<AskToolLink[]> {
  if (ordered.length === 0) return [];
  const userId = context.user.id;
  const rows = await prisma.link.findMany({
    where: { userId, deletedAt: null, id: { in: ordered.map((entry) => entry.id) } },
    select: ASK_LINK_SELECT,
  });
  const byId = new Map<string, AskLinkRow>(rows.map((row) => [row.id, row]));
  const paths = await loadFolderPaths(prisma, userId);
  return ordered.flatMap((entry) => {
    const row = byId.get(entry.id);
    const ref = row === undefined ? null : context.refs.refFor(row.id);
    if (row === undefined || ref === null) return [];
    return [
      toAskToolLink(row, ref, paths, { includeNotes: context.includeNotes, match: entry.match }),
    ];
  });
}
