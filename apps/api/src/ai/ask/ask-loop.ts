import {
  ASK_ACTIVITY_PHASE,
  ASK_EVENT_TYPE,
  ASK_LIMIT,
  type AskActivity,
  type AskSource,
} from '@shelfmark/contracts';
import { ASK_LOOP_OUTCOME } from '../models/ask-loop-outcome.const';
import { ASK_STOP_REASON } from '../models/ask-stop-reason.const';
import { ASK_TOOL_CHOICE } from '../models/ask-tool-choice.const';
import { ASK_TOOL_NAME } from '../models/ask-tool-name.const';
import type { AskLoopOutcome } from '../models/ask-loop-outcome.type';
import type { AskLoopParams } from '../models/ask-loop-params.interface';
import type { AskLoopResult } from '../models/ask-loop-result.interface';
import type { AskMessage } from '../models/ask-message.type';
import type { AskRoundChunk } from '../models/ask-round-chunk.type';
import type { AskToolCallBlock } from '../models/ask-tool-call-block.interface';
import type { AskToolOutcome } from '../models/ask-tool-outcome.interface';
import type { AskToolResultBlock } from '../models/ask-tool-result-block.interface';
import { serializeToolData } from './serialize-tool-data';

const TOO_MANY_CALLS = `At most ${ASK_LIMIT.ToolCallsPerRoundMax} tool calls per round; call it again if you still need it`;
const TOO_SLOW = 'The tool took too long; answer with what you have';
const UNKNOWN_TOOL = 'Unknown tool';
const TOOL_FAILED = 'The tool failed; answer with what you have';
/** Tools whose results are handed to the deep profile. */
const LIBRARY_TOOLS: ReadonlySet<string> = new Set([
  ASK_TOOL_NAME.SearchLinks,
  ASK_TOOL_NAME.CountLinks,
  ASK_TOOL_NAME.GetLink,
  ASK_TOOL_NAME.ListFolders,
  ASK_TOOL_NAME.ListTags,
]);

/** Resolves after `ms`, or at once when `signal` aborts (`'abort'`). */
function wait(ms: number, signal: AbortSignal): Promise<'timeout' | 'abort'> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve('abort');
      return;
    }
    const timer = setTimeout(() => resolve('timeout'), Math.max(0, ms));
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve('abort');
      },
      { once: true },
    );
  });
}

/**
 * One profile's tool loop (ADR 0055 point 5), provider-neutral. Each round is one model call: text
 * streams through the shared `CitationStream`; tool calls run in parallel (at most
 * `ToolCallsPerRoundMax`, extras answered with an error result) within `toolRoundMs`, each wrapped in
 * `activity` start and end events; `show_links` emits `links` cards where it was called. A call with
 * no first output (text or a tool call) within `roundFirstOutputMs` ends the loop; after
 * `ToolRoundsMax` tool rounds, or when less than `finalAnswerReserveMs` is left, the next call is
 * the forced answer (`tool_choice: none`). The caller's signal (hard stop, client gone) stops the
 * current call and skips pending tools. Thinking blocks stay in this loop's transcript only.
 */
export class AskLoop {
  private readonly messages: AskMessage[];
  /** Activities whose start went out in the current round. */
  private started = new Set<AskActivity>();
  private readonly result: AskLoopResult = {
    outcome: ASK_LOOP_OUTCOME.Answered,
    stopReason: null,
    calls: 0,
    toolCalls: {},
    usage: { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 },
    gathered: [],
    searches: [],
    shown: [],
  };

  constructor(private readonly params: AskLoopParams) {
    this.messages = [...params.messages];
  }

  async run(): Promise<AskLoopResult> {
    const { deadlines, signal } = this.params;
    for (let toolRounds = 0; ; toolRounds += 1) {
      if (signal.aborted) return this.end(this.abortOutcome());
      const left = this.left();
      if (left <= 0) return this.end(ASK_LOOP_OUTCOME.HardStop);
      const forced = toolRounds >= ASK_LIMIT.ToolRoundsMax || left < deadlines.finalAnswerReserveMs;
      const round = await this.callModel(forced, left);
      if (round.outcome !== null) return this.end(round.outcome);
      const end = round.end;
      if (end === null) return this.end(ASK_LOOP_OUTCOME.Failed);
      this.result.stopReason = end.stopReason;
      if (end.stopReason === ASK_STOP_REASON.Refusal) return this.end(ASK_LOOP_OUTCOME.Refused);
      const calls = end.blocks.filter(
        (block): block is AskToolCallBlock => block.type === 'tool_call',
      );
      if (end.stopReason !== ASK_STOP_REASON.ToolUse || calls.length === 0 || forced) {
        return this.end(ASK_LOOP_OUTCOME.Answered);
      }
      this.messages.push({ role: 'assistant', content: end.blocks });
      const tools = await this.runTools(calls);
      if (tools.escalate) return this.end(ASK_LOOP_OUTCOME.Escalate);
      if (signal.aborted) return this.end(this.abortOutcome());
      this.messages.push({ role: 'user', content: tools.results });
    }
  }

  private end(outcome: AskLoopOutcome): AskLoopResult {
    this.result.outcome = outcome;
    return this.result;
  }

  private abortOutcome(): AskLoopOutcome {
    return this.left() <= 0 ? ASK_LOOP_OUTCOME.HardStop : ASK_LOOP_OUTCOME.Client;
  }

  private left(): number {
    return this.params.started + this.params.deadlines.streamMaxMs - Date.now();
  }

  private emit(events: ReturnType<AskLoopParams['citations']['push']>): void {
    for (const event of events) this.params.sink.send(event);
  }

  private activity(
    activity: AskActivity | null,
    phase: 'start' | 'end',
    found: number | null,
  ): void {
    if (activity === null) return;
    this.params.sink.send({
      type: ASK_EVENT_TYPE.Activity,
      activity,
      phase: phase === 'start' ? ASK_ACTIVITY_PHASE.Start : ASK_ACTIVITY_PHASE.End,
      found,
    });
  }

  private startActivity(activity: AskActivity): void {
    if (this.started.has(activity)) return;
    this.started.add(activity);
    this.activity(activity, 'start', null);
  }

  /** One model call; `outcome` is set when the loop must stop (deadline, abort, failure). */
  private async callModel(
    forced: boolean,
    left: number,
  ): Promise<{
    outcome: AskLoopOutcome | null;
    end: Extract<AskRoundChunk, { type: 'end' }> | null;
  }> {
    const { params } = this;
    const controller = new AbortController();
    const stop = () => controller.abort();
    params.signal.addEventListener('abort', stop, { once: true });
    let firstOutput = false;
    let timedOut = false;
    const firstOutputTimer = setTimeout(() => {
      if (firstOutput) return;
      timedOut = true;
      controller.abort();
    }, params.deadlines.roundFirstOutputMs);
    const aborted = new Promise<null>((resolve) => {
      if (controller.signal.aborted) resolve(null);
      controller.signal.addEventListener('abort', () => resolve(null), { once: true });
    });
    this.started = new Set<AskActivity>();
    this.result.calls += 1;
    const iterator = params.provider
      .askRound(
        {
          profile: params.profile,
          system: params.system,
          tools: params.tools.definitions(params.profile.escalation),
          messages: this.messages,
          historyEnd: params.historyEnd,
          toolChoice: forced ? ASK_TOOL_CHOICE.None : ASK_TOOL_CHOICE.Auto,
          timeoutMs: left,
        },
        controller.signal,
      )
      [Symbol.asyncIterator]();
    try {
      for (;;) {
        const next = await Promise.race([iterator.next(), aborted]);
        if (next === null || controller.signal.aborted) {
          if (timedOut) return { outcome: ASK_LOOP_OUTCOME.FirstOutput, end: null };
          return { outcome: this.abortOutcome(), end: null };
        }
        if (next.done === true) return { outcome: ASK_LOOP_OUTCOME.Failed, end: null };
        const chunk = next.value;
        if (chunk.type === 'text') {
          firstOutput = true;
          this.emit(params.citations.push(chunk.text));
          continue;
        }
        if (chunk.type === 'tool_start') {
          firstOutput = true;
          const tool = params.tools.find(chunk.name, params.profile.escalation);
          if (tool?.activity) this.startActivity(tool.activity);
          continue;
        }
        if (chunk.type === 'error') return { outcome: ASK_LOOP_OUTCOME.Failed, end: null };
        this.addUsage(chunk.usage);
        return { outcome: null, end: chunk };
      }
    } finally {
      clearTimeout(firstOutputTimer);
      params.signal.removeEventListener('abort', stop);
      if (!controller.signal.aborted) controller.abort();
      // Stop the provider without waiting for it (it may still be blocked on the network).
      void iterator.return?.(undefined)?.catch(() => undefined);
    }
  }

  private addUsage(usage: AskLoopResult['usage']): void {
    const total = this.result.usage;
    total.input += usage.input;
    total.cacheRead += usage.cacheRead;
    total.cacheWrite += usage.cacheWrite;
    total.output += usage.output;
  }

  /** Runs one round's tool calls; cards and activity events go out as results arrive. */
  private async runTools(
    calls: readonly AskToolCallBlock[],
  ): Promise<{ results: AskToolResultBlock[]; escalate: boolean }> {
    const { params } = this;
    const round = new AbortController();
    const stop = () => round.abort();
    params.signal.addEventListener('abort', stop, { once: true });
    const timeout = wait(params.deadlines.toolRoundMs, round.signal);
    let escalate = false;
    try {
      const outcomes = await Promise.all(
        calls.map((call, index) =>
          index < ASK_LIMIT.ToolCallsPerRoundMax
            ? this.runTool(call, timeout)
            : Promise.resolve<AskToolOutcome>({ isError: true, data: TOO_MANY_CALLS, found: null }),
        ),
      );
      const results: AskToolResultBlock[] = [];
      for (const [index, call] of calls.entries()) {
        let outcome = outcomes[index] ?? { isError: true, data: TOOL_FAILED, found: null };
        if (outcome.escalate !== undefined && !escalate) {
          const refusal = await params.escalation(outcome.escalate);
          if (refusal === null) {
            escalate = true;
            continue;
          }
          outcome = { isError: true, data: refusal, found: null };
        }
        if (outcome.show !== undefined && !outcome.isError) await this.showCards(outcome.show);
        if (outcome.search !== undefined) this.result.searches.push(outcome.search);
        if (LIBRARY_TOOLS.has(call.name)) {
          this.result.gathered.push({
            name: call.name,
            isError: outcome.isError,
            data: outcome.data,
          });
        }
        results.push({
          type: 'tool_result',
          toolCallId: call.id,
          content: serializeToolData(outcome.data, outcome.isError),
          isError: outcome.isError,
        });
      }
      return { results, escalate };
    } finally {
      round.abort();
      params.signal.removeEventListener('abort', stop);
    }
  }

  private async runTool(
    call: AskToolCallBlock,
    timeout: Promise<'timeout' | 'abort'>,
  ): Promise<AskToolOutcome> {
    const { params } = this;
    this.result.toolCalls[call.name] = (this.result.toolCalls[call.name] ?? 0) + 1;
    const tool = params.tools.find(call.name, params.profile.escalation);
    if (tool === undefined) return { isError: true, data: UNKNOWN_TOOL, found: null };
    if (tool.activity !== null) this.startActivity(tool.activity);
    const outcome = await Promise.race([
      tool
        .call(params.context, call.input)
        .catch((): AskToolOutcome => ({ isError: true, data: TOOL_FAILED, found: null })),
      timeout.then((): AskToolOutcome => ({ isError: true, data: TOO_SLOW, found: null })),
    ]);
    this.activity(tool.activity, 'end', outcome.isError ? null : outcome.found);
    return outcome;
  }

  /** `links` cards at this point of the answer: numbered with the citations, live links only. */
  private async showCards(refs: readonly number[]): Promise<void> {
    const { params } = this;
    const links = await params.cards(refs);
    const items: AskSource[] = refs.flatMap((ref) => {
      const link = links.get(ref);
      return link === undefined ? [] : [{ n: params.citations.assign(ref), link }];
    });
    if (items.length === 0) return;
    this.result.shown.push(...refs.filter((ref) => links.has(ref)));
    const first = refs[0];
    const search = [...this.result.searches]
      .reverse()
      .find((record) => first !== undefined && record.refs.includes(first));
    this.emit(params.citations.flush());
    params.sink.send({
      type: ASK_EVENT_TYPE.Links,
      items,
      total: search !== undefined && search.total > items.length ? search.total : null,
      search: search?.filter ?? null,
    });
  }
}
