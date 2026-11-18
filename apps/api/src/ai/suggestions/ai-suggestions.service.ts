import { Injectable, NotFoundException } from '@nestjs/common';
import { AI_ERROR_MESSAGE, SUGGESTION_KIND } from '@shelfmark/contracts';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UserLinkEdit } from '../models/user-link-edit.interface';
import { SUGGESTION_ROW_STATE } from '../models/suggestion-row-state.const';

type Tx = Prisma.TransactionClient;

const OPEN_STATES: string[] = [SUGGESTION_ROW_STATE.Suggested, SUGGESTION_ROW_STATE.AutoApplied];
const TAG_KINDS: string[] = [SUGGESTION_KIND.Tag, SUGGESTION_KIND.NewTag];

/**
 * Suggestion states the user decides (#390): dismiss, and the marks after a user's own folder or tag
 * change. Every statement filters by the session `userId`.
 */
@Injectable()
export class AiSuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `POST /api/ai/suggestions/:id/dismiss`: hides the suggestion for good (idempotent; an accepted one
   * stays accepted). Foreign or missing is 404.
   */
  async dismiss(userId: string, id: string): Promise<void> {
    const row = await this.prisma.linkSuggestion.findFirst({
      where: { id, userId },
      select: { state: true },
    });
    if (!row) throw new NotFoundException(AI_ERROR_MESSAGE.SuggestionNotFound);
    if (!OPEN_STATES.includes(row.state)) return;
    await this.prisma.linkSuggestion.updateMany({
      where: { id, userId, state: { in: OPEN_STATES } },
      data: { state: SUGGESTION_ROW_STATE.Dismissed },
    });
  }

  /**
   * A user's folder or tag change on a link (inside its `PATCH` transaction): suggestions matching
   * the new choice become `accepted`; auto-applied ones the user moved away from are `dismissed`
   * (their "Moved by AI" mark is gone and they never come back).
   */
  async afterUserEdit(tx: Tx, userId: string, linkId: string, edit: UserLinkEdit): Promise<void> {
    if (edit.folderId !== undefined) {
      if (edit.folderId !== null) {
        await tx.linkSuggestion.updateMany({
          where: {
            userId,
            linkId,
            kind: SUGGESTION_KIND.Folder,
            folderId: edit.folderId,
            state: { in: OPEN_STATES },
          },
          data: { state: SUGGESTION_ROW_STATE.Accepted },
        });
      }
      await tx.linkSuggestion.updateMany({
        where: {
          userId,
          linkId,
          kind: SUGGESTION_KIND.Folder,
          state: SUGGESTION_ROW_STATE.AutoApplied,
        },
        data: { state: SUGGESTION_ROW_STATE.Dismissed },
      });
    }
    if (edit.tags !== undefined) {
      const chosen = new Set(edit.tags.map((name) => name.toLowerCase()));
      const rows = await tx.linkSuggestion.findMany({
        where: { userId, linkId, kind: { in: TAG_KINDS }, state: { in: OPEN_STATES } },
        select: { id: true, tagName: true, state: true },
      });
      const accepted = rows
        .filter((row) => row.tagName !== null && chosen.has(row.tagName.toLowerCase()))
        .map((row) => row.id);
      const dropped = rows
        .filter((row) => row.state === SUGGESTION_ROW_STATE.AutoApplied)
        .map((row) => row.id)
        .filter((id) => !accepted.includes(id));
      if (accepted.length > 0) {
        await tx.linkSuggestion.updateMany({
          where: { userId, id: { in: accepted } },
          data: { state: SUGGESTION_ROW_STATE.Accepted },
        });
      }
      if (dropped.length > 0) {
        await tx.linkSuggestion.updateMany({
          where: { userId, id: { in: dropped } },
          data: { state: SUGGESTION_ROW_STATE.Dismissed },
        });
      }
    }
  }
}
