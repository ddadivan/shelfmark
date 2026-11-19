import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AI_SEARCH_STATE,
  ASK_ACTIVITY,
  ASK_ACTIVITY_PHASE,
  ASK_DEPTH,
  ASK_ERROR_REASON,
  ASK_EVENT_TYPE,
  ASK_LIMIT,
  type AskAllowance,
  type AskErrorReason,
  type AskSource,
  type AskTurn,
  type AuthUser,
  type LinkResponse,
} from '@shelfmark/contracts';
import { LINK_INCLUDE } from '../../links/models/link-include.const';
import { toLinkResponse } from '../../links/to-link-response';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSearchStatusService } from '../embeddings/ai-search-status.service';
import { ASK_DEADLINES } from '../models/ask-deadlines.token';
import { ASK_LOOP_OUTCOME } from '../models/ask-loop-outcome.const';
import { ASK_MODEL_PROFILE } from '../models/ask-model-profile.const';
import { ASK_STOP_REASON } from '../models/ask-stop-reason.const';
import type { AskDeadlines } from '../models/ask-deadlines.interface';
import type { AskLog } from '../models/ask-log.interface';
import type { AskLoopResult } from '../models/ask-loop-result.interface';
import type { AskProgress } from '../models/ask-progress.interface';
import type { AskQuestion } from '../models/ask-question.interface';
import type { AskRun } from '../models/ask-run.interface';
import type { AskSink } from '../models/ask-sink.interface';
import {
  ASK_CHAT_SYSTEM_PROMPT,
  ASK_DEEP_SYSTEM_PROMPT,
} from '../prompt/ask-chat-system-prompt.const';
import { buildAskMessages } from '../prompt/build-ask-messages';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AiSettingsService } from '../settings/ai-settings.service';
import { AskEscalation } from './ask-escalation';
import { AskLoop } from './ask-loop';
import { askDay, AskUsageService } from './ask-usage.service';
import { CitationStream } from './citation-stream';
import { hydrateAskHistory } from './hydrate-ask-history';
import { AskToolRegistry } from './tools/ask-tool.registry';
import { LinkRefs } from './tools/link-refs';

/** Loop outcomes that leave an answer unfinished. */
const CUT: ReadonlySet<string> = new Set([
  ASK_LOOP_OUTCOME.Failed,
  ASK_LOOP_OUTCOME.FirstOutput,
  ASK_LOOP_OUTCOME.HardStop,
  ASK_LOOP_OUTCOME.Client,
  ASK_LOOP_OUTCOME.Refused,
]);

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
 * `POST /api/ai/ask` (F4, ADR 0052 and 0055): one turn of a chat over the session user's own links,
 * streamed as events. Order: AI and Ask on (else `off`) → the lease (else `busy`) → the history
 * re-read for the session user (refs first) → reserve one question (else `quota`) → `meta` → the
 * quick loop (Haiku 5.5 with tools) → maybe one deep loop (Sonnet 5.5, after an accepted
 * `request_deeper_answer`) → `done` with the live sources, the turn and the depth → release the lease.
 *
 * One question is one count whatever the rounds, tools or escalation. It is refunded (with a reserved
 * deep answer) when nothing reached the client (no text and no cards: failure, refusal, a deadline,
 * a client gone); once something arrived it counts. Any other exception after the reserve refunds
 * unless text was sent and ends the stream with `error` `unavailable`. Nothing is stored; the log line
 * carries counts, durations and tokens, never the question, history, tool arguments, results or answer.
 */
@Injectable()
export class AskService {
  private readonly logger = new Logger(AskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly searchStatus: AiSearchStatusService,
    private readonly registry: AiProviderRegistry,
    private readonly tools: AskToolRegistry,
    private readonly usage: AskUsageService,
    @Inject(ASK_DEADLINES) private readonly deadlines: AskDeadlines,
  ) {}

  async ask(user: AuthUser, request: AskQuestion, sink: AskSink): Promise<void> {
    const started = Date.now();
    const log: AskLog = {
      outcome: 'off',
      depth: ASK_DEPTH.Quick,
      history: request.history.length,
      calls: 0,
      tools: {},
      cited: 0,
      shown: 0,
      tokens: { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 },
    };
    try {
      await this.run(user, request, sink, started, log);
    } finally {
      const tools = Object.entries(log.tools)
        .map(([name, count]) => `${name}×${count}`)
        .join(' ');
      const { input, cacheRead, cacheWrite, output } = log.tokens;
      this.logger.log(
        `Ask: ${log.outcome} in ${Date.now() - started} ms, ${log.depth}, ${log.history} turn(s) of history, ${log.calls} call(s), tools [${tools}], ${log.cited} cited, ${log.shown} shown, tokens in ${input} cache read ${cacheRead} cache write ${cacheWrite} out ${output}`,
      );
    }
  }

  private async run(
    user: AuthUser,
    request: AskQuestion,
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
      const includeNotes = stored.settings.includeNotes;
      const status = await this.searchStatus.status(userId, stored, tier);
      const refs = new LinkRefs();
      const history = await hydrateAskHistory(
        this.prisma,
        userId,
        request.history,
        refs,
        includeNotes,
      );
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
      const progress: AskProgress = { text: false, ended: false };
      const tracked = trackProgress(sink, progress);
      const run: AskRun = {
        user,
        tier,
        question: request.question,
        history,
        refs,
        includeNotes,
        searchReady: status.state === AI_SEARCH_STATE.Ready,
        day,
        sink: tracked,
        started,
        log,
        refunded: false,
      };
      const citations = new CitationStream((ref) => refs.has(ref));
      const escalation = new AskEscalation(
        this.usage,
        userId,
        tier,
        day,
        citations,
        started,
        this.deadlines,
      );
      try {
        tracked.send({
          type: ASK_EVENT_TYPE.Meta,
          allowance: await this.usage.allowance(userId, tier),
        });
        await this.answer(run, citations, escalation);
      } catch (error: unknown) {
        await this.recover(run, escalation, progress, error);
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
    run: AskRun,
    escalation: AskEscalation,
    progress: AskProgress,
    error: unknown,
  ): Promise<void> {
    run.log.outcome = 'error';
    this.logger.warn(`Ask failed: ${error instanceof Error ? error.name : 'unknown error'}`);
    if (!progress.text && !run.refunded) {
      await this.refund(run, escalation).catch(() => undefined);
    }
    if (run.sink.closed || progress.ended) return;
    const allowance = await this.usage.allowance(run.user.id, run.tier).catch(() => null);
    run.sink.send({
      type: ASK_EVENT_TYPE.Error,
      reason: ASK_ERROR_REASON.Unavailable,
      counted: progress.text,
      allowance,
    });
  }

  private async refund(run: AskRun, escalation: AskEscalation): Promise<void> {
    await escalation.refund();
    await this.usage.refund(run.user.id, run.day);
    run.refunded = true;
  }

  /** The quick loop, maybe the deep loop, then `done` or `error`. */
  private async answer(
    run: AskRun,
    citations: CitationStream,
    escalation: AskEscalation,
  ): Promise<void> {
    const { sink, log } = run;
    const userId = run.user.id;
    if (sink.closed) {
      // The client left after `meta`: no model call, the question is not counted.
      await this.refund(run, escalation);
      log.outcome = 'client';
      return;
    }
    const controller = new AbortController();
    const hardStop = setTimeout(
      () => controller.abort(),
      Math.max(0, this.deadlines.streamMaxMs - (Date.now() - run.started)),
    );
    sink.onAbort(() => controller.abort());
    if (sink.closed) controller.abort();
    const provider = this.registry.for(run.user);
    const today = askDay(new Date());
    const loop = (deep: boolean, gathered?: AskLoopResult['gathered']) => {
      const built = buildAskMessages({
        history: run.history,
        question: run.question,
        today,
        gathered,
      });
      return new AskLoop({
        provider,
        profile: deep ? ASK_MODEL_PROFILE.Deep : ASK_MODEL_PROFILE.Quick,
        system: deep ? ASK_DEEP_SYSTEM_PROMPT : ASK_CHAT_SYSTEM_PROMPT,
        tools: this.tools,
        context: {
          user: run.user,
          tier: run.tier,
          includeNotes: run.includeNotes,
          searchReady: run.searchReady,
          refs: run.refs,
        },
        messages: built.messages,
        historyEnd: built.historyEnd,
        citations,
        sink,
        deadlines: this.deadlines,
        started: run.started,
        signal: controller.signal,
        escalation: escalation.gate,
        cards: (refs) => this.loadLinks(userId, run.refs, refs),
      }).run();
    };
    const results: AskLoopResult[] = [];
    try {
      const quick = await loop(false);
      results.push(quick);
      if (quick.outcome === ASK_LOOP_OUTCOME.Escalate) {
        log.depth = ASK_DEPTH.Deep;
        sink.send(this.deepActivity(ASK_ACTIVITY_PHASE.Start));
        const deep = await loop(true, quick.gathered);
        results.push(deep);
        sink.send(this.deepActivity(ASK_ACTIVITY_PHASE.End));
      }
    } finally {
      clearTimeout(hardStop);
    }
    await this.finish(run, citations, escalation, results);
  }

  private deepActivity(phase: (typeof ASK_ACTIVITY_PHASE)[keyof typeof ASK_ACTIVITY_PHASE]) {
    return {
      type: ASK_EVENT_TYPE.Activity,
      activity: ASK_ACTIVITY.Deep,
      phase,
      found: null,
    } as const;
  }

  private async finish(
    run: AskRun,
    citations: CitationStream,
    escalation: AskEscalation,
    results: readonly AskLoopResult[],
  ): Promise<void> {
    const { sink, log } = run;
    const userId = run.user.id;
    const last = results.at(-1);
    for (const result of results) {
      log.calls += result.calls;
      for (const [name, count] of Object.entries(result.toolCalls)) {
        log.tools[name] = (log.tools[name] ?? 0) + count;
      }
      log.tokens.input += result.usage.input;
      log.tokens.cacheRead += result.usage.cacheRead;
      log.tokens.cacheWrite += result.usage.cacheWrite;
      log.tokens.output += result.usage.output;
    }
    const shown = results.flatMap((result) => result.shown);
    const outcome = last?.outcome ?? ASK_LOOP_OUTCOME.Failed;
    log.shown = shown.length;
    if (!citations.hasText && shown.length === 0) {
      await this.refund(run, escalation);
      const refused = outcome === ASK_LOOP_OUTCOME.Refused;
      log.outcome = refused
        ? 'rejected'
        : outcome === ASK_LOOP_OUTCOME.Answered
          ? 'empty'
          : outcome;
      this.fail(
        sink,
        refused ? ASK_ERROR_REASON.Rejected : ASK_ERROR_REASON.Unavailable,
        await this.usage.allowance(userId, run.tier),
      );
      return;
    }
    // The deep answer counts only when the deep model wrote something (the hand-over needs no text).
    if (escalation.reserved && !citations.hasText && (results[1]?.shown.length ?? 0) === 0) {
      await escalation.refund();
    }
    for (const event of citations.flush()) sink.send(event);
    const truncated =
      citations.truncated || CUT.has(outcome) || last?.stopReason === ASK_STOP_REASON.MaxTokens;
    const links = await this.loadLinks(userId, run.refs, citations.cited);
    const sources: AskSource[] = citations.cited.flatMap((ref, index) => {
      const link = links.get(ref);
      return link === undefined ? [] : [{ n: index + 1, link }];
    });
    const searches = results.flatMap((result) => result.searches);
    log.cited = citations.citedInText.length;
    log.outcome = outcome === ASK_LOOP_OUTCOME.Answered && !truncated ? 'done' : outcome;
    const turn: AskTurn = {
      question: run.question,
      answer: citations.answer,
      links: sources
        .slice(0, ASK_LIMIT.LinksPerTurnMax)
        .map((source) => ({ n: source.n, id: source.link.id })),
    };
    sink.send({
      type: ASK_EVENT_TYPE.Done,
      sources,
      notFound:
        searches.length > 0 &&
        searches.every((search) => search.total === 0) &&
        citations.cited.length === 0,
      truncated,
      allowance: await this.usage.allowance(userId, run.tier),
      turn,
      depth: log.depth,
    });
  }

  /** The session user's live links of these refs, as the web shows them; others left out. */
  private async loadLinks(
    userId: string,
    refs: LinkRefs,
    wanted: readonly number[],
  ): Promise<Map<number, LinkResponse>> {
    const ids = wanted.flatMap((ref) => {
      const id = refs.idFor(ref);
      return id === undefined ? [] : [id];
    });
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, id: { in: ids } },
      include: LINK_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return new Map(
      wanted.flatMap((ref) => {
        const row = byId.get(refs.idFor(ref) ?? '');
        return row === undefined ? [] : [[ref, toLinkResponse(row)] as const];
      }),
    );
  }

  private fail(sink: AskSink, reason: AskErrorReason, allowance: AskAllowance | null): void {
    sink.send({ type: ASK_EVENT_TYPE.Error, reason, counted: false, allowance });
  }
}
