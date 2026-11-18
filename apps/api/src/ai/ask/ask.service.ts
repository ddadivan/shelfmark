import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AI_SEARCH_STATE,
  ASK_ERROR_REASON,
  ASK_EVENT_TYPE,
  type AskAllowance,
  type AskErrorReason,
  type AskSource,
  type AuthUser,
} from '@shelfmark/contracts';
import { LINK_INCLUDE } from '../../links/models/link-include.const';
import { toLinkResponse } from '../../links/to-link-response';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSearchStatusService } from '../embeddings/ai-search-status.service';
import { ASK_DEADLINES } from '../models/ask-deadlines.token';
import { ASK_STOP_REASON } from '../models/ask-stop-reason.const';
import type { AskAnswerContext } from '../models/ask-answer-context.interface';
import type { AskChunk } from '../models/ask-chunk.type';
import type { AskDeadlines } from '../models/ask-deadlines.interface';
import type { AskInterruption } from '../models/ask-interruption.type';
import type { AskLog } from '../models/ask-log.interface';
import type { AskProgress } from '../models/ask-progress.interface';
import type { AskRetrieval } from '../models/ask-retrieval.interface';
import type { AskSink } from '../models/ask-sink.interface';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AiSettingsService } from '../settings/ai-settings.service';
import { AskRetrievalService } from './ask-retrieval.service';
import { AskUsageService } from './ask-usage.service';
import { CitationStream } from './citation-stream';

/** The sink, noting whether text and a closing `done` or `error` were sent through it. */
function trackProgress(sink: AskSink, progress: AskProgress): AskSink {
  return {
    get closed() {
      return sink.closed;
    },
    send(event) {
      if (event.type === ASK_EVENT_TYPE.Text) progress.text = true;
      if (event.type === ASK_EVENT_TYPE.Done || event.type === ASK_EVENT_TYPE.Error) {
        progress.ended = true;
      }
      sink.send(event);
    },
    onAbort(listener) {
      sink.onAbort(listener);
    },
  };
}

/**
 * `POST /api/ai/ask` (F4, ADR 0052): one single-turn answer from the session user's own links,
 * streamed as events. Order: AI and Ask on (else `off`) → the lease (else `busy`) → retrieval →
 * nothing found → `done` `notFound` (no model call, not counted) → reserve a question (else `quota`)
 * → `meta` → the provider stream through `CitationStream` → `done` → release the lease. The question
 * is refunded when the stream fails, is cut by the first-text deadline, is refused, or the client
 * leaves before any text (a client gone before the reserve or the provider call costs nothing); once
 * text arrived it counts. Any other exception after the reserve refunds the question unless text was
 * sent and ends the stream with `error` `unavailable` (outcome `error`). Nothing is stored; the log line carries the
 * outcome, duration, source and citation counts and token counts, never the question or the answer.
 */
@Injectable()
export class AskService {
  private readonly logger = new Logger(AskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly searchStatus: AiSearchStatusService,
    private readonly registry: AiProviderRegistry,
    private readonly retrieval: AskRetrievalService,
    private readonly usage: AskUsageService,
    @Inject(ASK_DEADLINES) private readonly deadlines: AskDeadlines,
  ) {}

  async ask(user: AuthUser, question: string, sink: AskSink): Promise<void> {
    const started = Date.now();
    const log: AskLog = { outcome: 'off', retrieved: 0, cited: 0, inputTokens: 0, outputTokens: 0 };
    try {
      await this.run(user, question, sink, started, log);
    } finally {
      this.logger.log(
        `Ask: ${log.outcome} in ${Date.now() - started} ms, ${log.retrieved} source(s), ${log.cited} cited, tokens ${log.inputTokens}/${log.outputTokens}`,
      );
    }
  }

  private async run(
    user: AuthUser,
    question: string,
    sink: AskSink,
    started: number,
    log: AskLog,
  ): Promise<void> {
    const userId = user.id;
    const entitlements = await this.settings.entitlements(this.prisma, userId);
    const stored = await this.settings.read(this.prisma, userId);
    const tier = entitlements.aiTier;
    if (!stored.settings.enabled || !stored.settings.ask) {
      this.fail(sink, ASK_ERROR_REASON.Off, null);
      return;
    }
    const lease = await this.usage.takeLease(userId);
    if (lease === null) {
      log.outcome = 'busy';
      this.fail(sink, ASK_ERROR_REASON.Busy, await this.usage.allowance(userId, tier));
      return;
    }
    try {
      const status = await this.searchStatus.status(userId, stored, tier);
      const found = await this.retrieval.retrieve(user, question, {
        searchReady: status.state === AI_SEARCH_STATE.Ready,
        tier,
        includeNotes: stored.settings.includeNotes,
      });
      log.retrieved = found.sources.length;
      if (found.sources.length === 0) {
        log.outcome = 'not-found';
        sink.send({
          type: ASK_EVENT_TYPE.Done,
          sources: [],
          notFound: true,
          truncated: false,
          allowance: await this.usage.allowance(userId, tier),
        });
        return;
      }
      if (sink.closed) {
        log.outcome = 'client';
        return;
      }
      const day = await this.usage.reserve(userId, tier);
      if (day === null) {
        log.outcome = 'quota';
        this.fail(sink, ASK_ERROR_REASON.Quota, await this.usage.allowance(userId, tier));
        return;
      }
      const context: AskAnswerContext = { day, tier, log, refunded: false };
      const progress: AskProgress = { text: false, ended: false };
      const tracked = trackProgress(sink, progress);
      try {
        tracked.send({
          type: ASK_EVENT_TYPE.Meta,
          allowance: await this.usage.allowance(userId, tier),
          retrieved: found.sources.length,
        });
        await this.answer(
          user,
          question,
          found,
          stored.settings.includeNotes,
          tracked,
          started,
          context,
        );
      } catch (error: unknown) {
        await this.recover(userId, context, progress, tracked, error);
      }
    } finally {
      await this.usage.releaseLease(userId, lease);
    }
  }

  /**
   * After an unexpected exception once the question was reserved: refunds it unless text was sent
   * (or it was refunded already), ends an open stream with `error` `unavailable` unless `done` or
   * `error` went out, and logs the outcome `error` (the error's name only, never its message).
   */
  private async recover(
    userId: string,
    context: AskAnswerContext,
    progress: AskProgress,
    sink: AskSink,
    error: unknown,
  ): Promise<void> {
    context.log.outcome = 'error';
    this.logger.warn(`Ask failed: ${error instanceof Error ? error.name : 'unknown error'}`);
    if (!progress.text && !context.refunded) {
      await this.refund(userId, context).catch(() => undefined);
    }
    if (sink.closed || progress.ended) return;
    const allowance = await this.usage.allowance(userId, context.tier).catch(() => null);
    sink.send({
      type: ASK_EVENT_TYPE.Error,
      reason: ASK_ERROR_REASON.Unavailable,
      counted: progress.text,
      allowance,
    });
  }

  private async refund(userId: string, context: AskAnswerContext): Promise<void> {
    await this.usage.refund(userId, context.day);
    context.refunded = true;
  }

  /** Streams the provider's answer and ends with `done` or `error`. */
  private async answer(
    user: AuthUser,
    question: string,
    found: AskRetrieval,
    includeNotes: boolean,
    sink: AskSink,
    started: number,
    context: AskAnswerContext,
  ): Promise<void> {
    const { tier, log } = context;
    if (sink.closed) {
      // The client left after `meta`: no provider call, the question is not counted.
      await this.refund(user.id, context);
      log.outcome = 'client';
      return;
    }
    const controller = new AbortController();
    const state: { interruption: AskInterruption | null } = { interruption: null };
    let wake: () => void = () => undefined;
    const interrupted = new Promise<null>((resolve) => {
      wake = () => resolve(null);
    });
    const interrupt = (why: AskInterruption) => {
      if (state.interruption !== null) return;
      state.interruption = why;
      controller.abort();
      wake();
    };
    const elapsed = Date.now() - started;
    const firstTokenTimer = setTimeout(
      () => interrupt('first-token'),
      Math.max(0, this.deadlines.firstTokenMs - elapsed),
    );
    const hardStopTimer = setTimeout(
      () => interrupt('hard-stop'),
      Math.max(0, this.deadlines.streamMaxMs - elapsed),
    );
    sink.onAbort(() => interrupt('client'));
    if (sink.closed) interrupt('client');

    const citations = new CitationStream(found.sources.length);
    const iterator = this.registry
      .for(user)
      .askStream({ question, sources: found.sources, includeNotes }, controller.signal)
      [Symbol.asyncIterator]();
    let last: AskChunk | null = null;
    try {
      while (state.interruption === null) {
        const next = await Promise.race([iterator.next(), interrupted]);
        if (next === null || next.done === true) break;
        const chunk = next.value;
        if (chunk.type === 'text') {
          clearTimeout(firstTokenTimer);
          for (const event of citations.push(chunk.text)) sink.send(event);
          if (citations.truncated) break;
          continue;
        }
        last = chunk;
        break;
      }
    } finally {
      clearTimeout(firstTokenTimer);
      clearTimeout(hardStopTimer);
      if (!controller.signal.aborted) controller.abort();
      // Stop the provider without waiting for it (it may still be blocked on the network).
      void iterator.return?.(undefined)?.catch(() => undefined);
    }

    if (last?.type === 'end') {
      log.inputTokens = last.inputTokens;
      log.outputTokens = last.outputTokens;
    }
    const refused = last?.type === 'end' && last.stopReason === ASK_STOP_REASON.Refusal;
    if (!citations.hasText) {
      await this.refund(user.id, context);
      const reason = refused ? ASK_ERROR_REASON.Rejected : ASK_ERROR_REASON.Unavailable;
      log.outcome = state.interruption ?? (refused ? 'rejected' : 'unavailable');
      this.fail(sink, reason, await this.usage.allowance(user.id, tier));
      return;
    }
    for (const event of citations.flush()) sink.send(event);
    const truncated =
      citations.truncated ||
      state.interruption !== null ||
      last === null ||
      last.type === 'error' ||
      last.stopReason !== ASK_STOP_REASON.Done;
    const sources = await this.liveSources(user.id, found.linkIds, citations.cited);
    log.cited = citations.cited.length;
    log.outcome = state.interruption ?? (truncated ? 'truncated' : 'done');
    sink.send({
      type: ASK_EVENT_TYPE.Done,
      sources,
      notFound: citations.cited.length === 0,
      truncated,
      allowance: await this.usage.allowance(user.id, tier),
    });
  }

  /** The cited links re-read live with the session `userId`, numbered as cited; trashed ones left out. */
  private async liveSources(
    userId: string,
    linkIds: readonly string[],
    cited: readonly number[],
  ): Promise<AskSource[]> {
    const ids = cited.flatMap((n) => {
      const id = linkIds[n - 1];
      return id === undefined ? [] : [id];
    });
    if (ids.length === 0) return [];
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, id: { in: ids } },
      include: LINK_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return cited.flatMap((n, index) => {
      const row = byId.get(linkIds[n - 1] ?? '');
      return row === undefined ? [] : [{ n: index + 1, link: toLinkResponse(row) }];
    });
  }

  private fail(sink: AskSink, reason: AskErrorReason, allowance: AskAllowance | null): void {
    sink.send({
      type: ASK_EVENT_TYPE.Error,
      reason,
      counted: false,
      allowance,
    });
  }
}
