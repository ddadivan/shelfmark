import { ASK_LIMIT, type AskTurn } from '@shelfmark/contracts';
import { loadFolderPaths } from '../../mcp/tools/folder-tree';
import type { PrismaService } from '../../prisma/prisma.service';
import { ASK_LINK_SELECT } from '../models/ask-link-select.const';
import type { AskHistoryTurn } from '../models/ask-history-turn.interface';
import type { AskToolLink } from '../models/ask-tool-link.interface';
import type { LinkRefs } from './tools/link-refs';
import { toAskToolLink } from './tools/to-ask-tool-link';

const MARKER = /\[(\d{1,2})\]/gu;

/**
 * The client-held history of the open chat, made safe (ADR 0055 points 4, 6 and 8): every link id is
 * re-read with the session `userId` (another user's, trashed or unknown ids are dropped and their
 * markers removed), the live ones get this question's refs first, in turn order (deterministic, so
 * the history prefix stays cacheable), and each answer's `[n]` markers are rewritten to those refs.
 * Other brackets stay text. A forged turn can only address the user's own live links.
 */
export async function hydrateAskHistory(
  prisma: PrismaService,
  userId: string,
  history: readonly AskTurn[],
  refs: LinkRefs,
  includeNotes: boolean,
): Promise<AskHistoryTurn[]> {
  const turns = history.slice(-ASK_LIMIT.HistoryTurnsMax);
  const ids = [...new Set(turns.flatMap((turn) => turn.links.map((link) => link.id)))];
  const rows =
    ids.length === 0
      ? []
      : await prisma.link.findMany({
          where: { userId, deletedAt: null, id: { in: ids } },
          select: ASK_LINK_SELECT,
        });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const paths =
    rows.length === 0 ? new Map<string, string>() : await loadFolderPaths(prisma, userId);
  return turns.map((turn) => {
    const toRef = new Map<number, number>();
    const dropped = new Set<number>();
    const links: AskToolLink[] = [];
    for (const link of turn.links.slice(0, ASK_LIMIT.LinksPerTurnMax)) {
      const row = byId.get(link.id);
      const ref = row === undefined ? null : refs.refFor(row.id);
      if (row === undefined || ref === null) {
        dropped.add(link.n);
        continue;
      }
      toRef.set(link.n, ref);
      if (!links.some((known) => known.ref === ref)) {
        links.push(toAskToolLink(row, ref, paths, { includeNotes }));
      }
    }
    const answer = Array.from(
      turn.answer.replace(MARKER, (marker, digits: string) => {
        const n = Number(digits);
        const ref = toRef.get(n);
        if (ref !== undefined) return `[${ref}]`;
        return dropped.has(n) ? '' : marker;
      }),
    )
      .slice(0, ASK_LIMIT.AnswerMaxChars)
      .join('');
    return { question: turn.question, answer, links };
  });
}
