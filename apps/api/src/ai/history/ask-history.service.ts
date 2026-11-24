import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ASK_HISTORY_LIMIT,
  ASK_LIMIT,
  type AskConversationListResponse,
  type AskConversationResponse,
  type AskConversationTurn,
  type AskConversationsDeletedResponse,
  type AskSource,
  type AskTurn,
  type LinkResponse,
} from '@shelfmark/contracts';
import type { Prisma } from '../../generated/prisma/client';
import { LINK_INCLUDE } from '../../links/models/link-include.const';
import { toLinkResponse } from '../../links/to-link-response';
import { PrismaService } from '../../prisma/prisma.service';
import { ASK_HISTORY_LOCK_PREFIX } from '../models/ask-history-lock-prefix.const';
import type { AskTurnRecord } from '../models/ask-turn-record.interface';
import { decodeAskHistoryCursor, encodeAskHistoryCursor } from './ask-history-cursor';
import { readStoredCards, readStoredDepth, readStoredSteps } from './read-stored-ask-turn';

const TURN_SELECT = {
  question: true,
  answer: true,
  steps: true,
  cards: true,
  notFound: true,
  truncated: true,
  depth: true,
  createdAt: true,
  links: { select: { n: true, linkId: true }, orderBy: { n: 'asc' } },
} as const satisfies Prisma.AskConversationTurnSelect;

/** The first question as the title: at most `TitleMaxChars` characters (code points). */
export function askConversationTitle(question: string): string {
  return Array.from(question.trim()).slice(0, ASK_HISTORY_LIMIT.TitleMaxChars).join('') || '…';
}

/**
 * Ask history (ADR 0055 amendment, 2026-11-24): the session user's stored conversations. Turns are
 * written only by `AskService` (`append`) from what the server streamed; the client never sends an
 * answer to store. Links are stored by id and re-read live with the session `userId` on every read
 * (foreign, trashed or deleted links are left out). Every query filters by `userId`; a foreign or
 * missing conversation is 404. Never logs a question or an answer.
 */
@Injectable()
export class AskHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    limit?: number,
    cursor?: string,
  ): Promise<AskConversationListResponse> {
    const take = limit ?? ASK_HISTORY_LIMIT.PageSize;
    const after = cursor === undefined ? null : decodeAskHistoryCursor(cursor);
    if (cursor !== undefined && after === null) {
      throw new BadRequestException('Invalid cursor');
    }
    const rows = await this.prisma.askConversation.findMany({
      where: {
        userId,
        ...(after === null
          ? {}
          : {
              OR: [
                { updatedAt: { lt: after.updatedAt } },
                { updatedAt: after.updatedAt, id: { lt: after.id } },
              ],
            }),
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { turns: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });
    const page = rows.slice(0, take);
    const last = page.at(-1);
    return {
      items: page.map((row) => ({
        id: row.id,
        title: row.title,
        turns: row._count.turns,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      nextCursor:
        rows.length > take && last !== undefined
          ? encodeAskHistoryCursor({ updatedAt: last.updatedAt, id: last.id })
          : null,
    };
  }

  async get(userId: string, id: string): Promise<AskConversationResponse> {
    const row = await this.prisma.askConversation.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        turns: { select: TURN_SELECT, orderBy: { position: 'asc' } },
      },
    });
    if (row === null) throw new NotFoundException('Conversation not found');
    const links = await this.liveLinks(
      userId,
      row.turns.flatMap((turn) => turn.links.map((link) => link.linkId)),
    );
    return {
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      turns: row.turns.map((turn) => {
        const byN = new Map<number, LinkResponse>();
        for (const ref of turn.links) {
          const link = links.get(ref.linkId);
          if (link !== undefined) byN.set(ref.n, link);
        }
        const sources: AskSource[] = [...byN].map(([n, link]) => ({ n, link }));
        const result: AskConversationTurn = {
          turn: {
            question: turn.question,
            answer: turn.answer,
            links: sources.map((source) => ({ n: source.n, id: source.link.id })),
          },
          sources,
          cards: readStoredCards(turn.cards).map((group) => ({
            items: group.n.flatMap((n) => {
              const link = byN.get(n);
              return link === undefined ? [] : [{ n, link }];
            }),
            total: group.total,
            search: group.search,
          })),
          steps: readStoredSteps(turn.steps),
          notFound: turn.notFound,
          truncated: turn.truncated,
          depth: readStoredDepth(turn.depth),
          createdAt: turn.createdAt.toISOString(),
        };
        return result;
      }),
    };
  }

  /** Deletes one conversation of the user; 404 when it is not theirs or gone. */
  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.askConversation.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException('Conversation not found');
  }

  /** "Clear all": every conversation of the user. */
  async clear(userId: string): Promise<AskConversationsDeletedResponse> {
    const { count } = await this.prisma.askConversation.deleteMany({ where: { userId } });
    return { deleted: count };
  }

  /**
   * The last `ASK_LIMIT.HistoryTurnsMax` stored turns of the user's conversation, oldest first, as
   * the model history (links by id; `hydrateAskHistory` re-reads them); `null` when it is not theirs.
   */
  async storedHistory(userId: string, id: string): Promise<AskTurn[] | null> {
    const row = await this.prisma.askConversation.findFirst({
      where: { id, userId },
      select: {
        turns: {
          select: {
            question: true,
            answer: true,
            links: { select: { n: true, linkId: true }, orderBy: { n: 'asc' } },
          },
          orderBy: { position: 'desc' },
          take: ASK_LIMIT.HistoryTurnsMax,
        },
      },
    });
    if (row === null) return null;
    return row.turns.reverse().map((turn) => ({
      question: turn.question,
      answer: turn.answer,
      links: turn.links.map((link) => ({ n: link.n, id: link.linkId })),
    }));
  }

  /**
   * Appends a finished turn to the user's conversation `id`, or starts one (titled by the question)
   * when `id` is `null` or not theirs; answers the conversation id. Under the `ask-history:` lock:
   * past `ConversationsMax` the oldest conversations go, past `TurnsPerConversationMax` the oldest
   * turns. Link refs are written only for the user's own links (composite FK).
   */
  async append(userId: string, id: string | null, record: AskTurnRecord): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${ASK_HISTORY_LOCK_PREFIX + userId}, 0))`;
      const now = new Date();
      const existing =
        id === null
          ? null
          : await tx.askConversation.findFirst({ where: { id, userId }, select: { id: true } });
      const conversationId =
        existing?.id ??
        (
          await tx.askConversation.create({
            data: {
              userId,
              title: askConversationTitle(record.turn.question),
              createdAt: now,
              updatedAt: now,
            },
            select: { id: true },
          })
        ).id;
      if (existing === null) {
        const keep = await tx.askConversation.findMany({
          where: { userId, id: { not: conversationId } },
          select: { id: true },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: ASK_HISTORY_LIMIT.ConversationsMax - 1,
        });
        await tx.askConversation.deleteMany({
          where: { userId, id: { notIn: [conversationId, ...keep.map((row) => row.id)] } },
        });
      }
      const top = await tx.askConversationTurn.aggregate({
        where: { conversationId, userId },
        _max: { position: true },
      });
      const position = (top._max.position ?? -1) + 1;
      const ids = [...new Set(record.turn.links.map((link) => link.id))];
      const own = new Set(
        ids.length === 0
          ? []
          : (
              await tx.link.findMany({
                where: { userId, id: { in: ids } },
                select: { id: true },
              })
            ).map((row) => row.id),
      );
      const links = record.turn.links
        .slice(0, ASK_LIMIT.LinksPerTurnMax)
        .filter((link) => own.has(link.id));
      const created = await tx.askConversationTurn.create({
        data: {
          conversationId,
          userId,
          position,
          question: record.turn.question,
          answer: Array.from(record.turn.answer).slice(0, ASK_LIMIT.AnswerMaxChars).join(''),
          steps: record.steps.map((step) => ({ activity: step.activity, found: step.found })),
          cards: record.cards.map((group) => ({
            n: group.n,
            total: group.total,
            search: group.search === null ? null : { ...group.search },
          })),
          notFound: record.notFound,
          truncated: record.truncated,
          depth: record.depth,
          createdAt: now,
        },
        select: { id: true },
      });
      if (links.length > 0) {
        await tx.askConversationTurnLink.createMany({
          data: links.map((link) => ({ turnId: created.id, n: link.n, linkId: link.id, userId })),
        });
      }
      await tx.askConversationTurn.deleteMany({
        where: {
          conversationId,
          userId,
          position: { lte: position - ASK_HISTORY_LIMIT.TurnsPerConversationMax },
        },
      });
      await tx.askConversation.update({
        where: { id: conversationId },
        data: { updatedAt: now },
      });
      return conversationId;
    });
  }

  /** The user's links of these ids that are live, by id. */
  private async liveLinks(userId: string, ids: string[]): Promise<Map<string, LinkResponse>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, id: { in: unique } },
      include: LINK_INCLUDE,
    });
    return new Map(rows.map((row) => [row.id, toLinkResponse(row)]));
  }
}
