import { inject, Service } from '@angular/core';
import {
  ASK_DEPTH,
  ASK_HISTORY_LIMIT,
  ASK_LIMIT,
  type AskConversationListResponse,
  type AskConversationResponse,
  type AskConversationSummary,
  type AskSource,
  type AskTurn,
} from '@shelfmark/contracts';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import type { MockAskConversation } from './models/mock-ask-conversation.interface';
import type { MockAskTurnRecord } from './models/mock-ask-turn-record.interface';

const DAY_MS = 86_400_000;

/**
 * The Ask history of the mock builds (ADR 0055 amendment), in memory: a reload starts again from
 * the seeded conversations (titles of the 11-ask design, two today and three earlier). Like the
 * API: turns are appended only by the mock `ask` from what it streamed, links are kept by id and
 * read live from the mock library, at most `ConversationsMax` conversations and
 * `TurnsPerConversationMax` turns, `RetentionDays` after the last turn.
 */
@Service()
export class MockAskHistory {
  private readonly library = inject(MockLibraryData);
  private conversations: MockAskConversation[] = this.seed();

  list(
    cursor?: string,
    pageSize: number = ASK_HISTORY_LIMIT.PageSize,
  ): AskConversationListResponse {
    const live = this.live();
    const start =
      cursor === undefined ? 0 : Math.max(0, live.findIndex((c) => c.id === cursor) + 1);
    const page = live.slice(start, start + pageSize);
    const last = page.at(-1);
    return {
      items: page.map((conversation) => this.summary(conversation)),
      nextCursor: start + pageSize < live.length && last !== undefined ? last.id : null,
    };
  }

  get(id: string): AskConversationResponse | null {
    const conversation = this.live().find((candidate) => candidate.id === id);
    if (conversation === undefined) return null;
    const byId = new Map(this.library.links.map((link) => [link.id, link]));
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: new Date(conversation.createdAt).toISOString(),
      updatedAt: new Date(conversation.updatedAt).toISOString(),
      turns: conversation.turns.map((record) => {
        const sources: AskSource[] = record.turn.links.flatMap((ref) => {
          const link = byId.get(ref.id);
          return link === undefined ? [] : [{ n: ref.n, link: this.library.linkView(link) }];
        });
        const byN = new Map(sources.map((source) => [source.n, source]));
        return {
          turn: { ...record.turn, links: sources.map((s) => ({ n: s.n, id: s.link.id })) },
          sources,
          cards: record.cards.map((group) => ({
            items: group.n.flatMap((n) => {
              const source = byN.get(n);
              return source === undefined ? [] : [source];
            }),
            total: group.total,
            search: group.search,
          })),
          steps: record.steps,
          notFound: record.notFound,
          truncated: record.truncated,
          depth: record.depth,
          createdAt: new Date(record.createdAt).toISOString(),
        };
      }),
    };
  }

  /** The stored turns the next question continues from (`null` for an unknown id). */
  turns(id: string): AskTurn[] | null {
    const conversation = this.live().find((candidate) => candidate.id === id);
    return conversation === undefined
      ? null
      : conversation.turns.slice(-ASK_LIMIT.HistoryTurnsMax).map((record) => record.turn);
  }

  /** Appends a finished turn (or starts a conversation); answers its id. */
  append(id: string | null, record: Omit<MockAskTurnRecord, 'createdAt'>): string {
    const now = Date.now();
    const turn: MockAskTurnRecord = { ...record, createdAt: now };
    const existing = id === null ? undefined : this.live().find((c) => c.id === id);
    if (existing !== undefined) {
      existing.turns = [...existing.turns, turn].slice(-ASK_HISTORY_LIMIT.TurnsPerConversationMax);
      existing.updatedAt = now;
      return existing.id;
    }
    const created: MockAskConversation = {
      id: globalThis.crypto.randomUUID(),
      title: Array.from(record.turn.question).slice(0, ASK_HISTORY_LIMIT.TitleMaxChars).join(''),
      createdAt: now,
      updatedAt: now,
      turns: [turn],
    };
    this.conversations = [created, ...this.live()].slice(0, ASK_HISTORY_LIMIT.ConversationsMax);
    return created.id;
  }

  remove(id: string): boolean {
    const before = this.conversations.length;
    this.conversations = this.conversations.filter((conversation) => conversation.id !== id);
    return this.conversations.length < before;
  }

  clear(): number {
    const count = this.live().length;
    this.conversations = [];
    return count;
  }

  /** Newest first, without the ones past the retention. */
  private live(): MockAskConversation[] {
    const cutoff = Date.now() - ASK_HISTORY_LIMIT.RetentionDays * DAY_MS;
    this.conversations = this.conversations
      .filter((conversation) => conversation.updatedAt >= cutoff)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return this.conversations;
  }

  private summary(conversation: MockAskConversation): AskConversationSummary {
    return {
      id: conversation.id,
      title: conversation.title,
      turns: conversation.turns.length,
      createdAt: new Date(conversation.createdAt).toISOString(),
      updatedAt: new Date(conversation.updatedAt).toISOString(),
    };
  }

  private seed(): MockAskConversation[] {
    const now = Date.now();
    const at = (ms: number): number => now - ms;
    const conversation = (title: string, answer: string, ago: number): MockAskConversation => ({
      id: globalThis.crypto.randomUUID(),
      title,
      createdAt: at(ago),
      updatedAt: at(ago),
      turns: [
        {
          turn: { question: title, answer, links: [] },
          steps: [],
          cards: [],
          notFound: false,
          truncated: false,
          depth: ASK_DEPTH.Quick,
          createdAt: at(ago),
        },
      ],
    });
    return [
      conversation(
        'Something to watch this weekend, under an hour',
        'Look in Watch later: the shorter videos there fit an evening.',
        60_000,
      ),
      conversation('How many links do I have?', 'You have a few dozen links.', 120_000),
      conversation(
        'Which Signal Forms video first?',
        'Start with the overview talk, then the deep dive.',
        2 * DAY_MS,
      ),
      conversation('Coats I saved in autumn', 'You saved two winter coats.', 5 * DAY_MS),
      conversation(
        'Summarise my Design folder',
        'Mostly colour, type and layout references.',
        9 * DAY_MS,
      ),
    ];
  }
}
