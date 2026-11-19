import { ASK_ACTIVITY, ASK_DEPTH, type AskEvent, type LinkResponse } from '@shelfmark/contracts';
import { ASK_MODEL_PROFILE } from '../models/ask-model-profile.const';
import { ASK_TOOL_NAME } from '../models/ask-tool-name.const';
import type { AiProvider } from '../models/ai-provider.interface';
import type { AskDeadlines } from '../models/ask-deadlines.interface';
import type { AskLoopParams } from '../models/ask-loop-params.interface';
import type { AskRoundChunk } from '../models/ask-round-chunk.type';
import type { AskRoundInput } from '../models/ask-round-input.interface';
import type { AskSink } from '../models/ask-sink.interface';
import type { AskTool } from '../models/ask-tool.interface';
import type { AskToolOutcome } from '../models/ask-tool-outcome.interface';
import type { AskToolbox } from '../models/ask-toolbox.interface';
import { AskLoop } from './ask-loop';
import { CitationStream } from './citation-stream';
import { LinkRefs } from './tools/link-refs';

type Script = (input: AskRoundInput, signal: AbortSignal) => AsyncGenerator<AskRoundChunk>;

const USAGE = { input: 10, cacheRead: 100, cacheWrite: 0, output: 5 };
const DEADLINES: AskDeadlines = {
  firstTokenMs: 8000,
  streamMaxMs: 24000,
  roundFirstOutputMs: 200,
  toolRoundMs: 100,
  finalAnswerReserveMs: 50,
  escalateBeforeMs: 10000,
};

function answer(text: string): Script {
  return async function* () {
    yield { type: 'text', text };
    yield { type: 'end', stopReason: 'done', blocks: [{ type: 'text', text }], usage: USAGE };
  };
}

function calls(
  ...list: { name: string; input?: unknown; text?: string; thinking?: boolean }[]
): Script {
  return async function* () {
    const text = list.map((call) => call.text ?? '').join('');
    if (text !== '') yield { type: 'text', text };
    for (const call of list) yield { type: 'tool_start', name: call.name };
    yield {
      type: 'end',
      stopReason: 'tool-use',
      blocks: [
        ...(list.some((call) => call.thinking)
          ? [{ type: 'opaque' as const, block: { type: 'thinking', signature: 's' } }]
          : []),
        ...(text === '' ? [] : [{ type: 'text' as const, text }]),
        ...list.map((call, index) => ({
          type: 'tool_call' as const,
          id: `t${index}`,
          name: call.name,
          input: call.input ?? {},
        })),
      ],
      usage: USAGE,
    };
  };
}

function hang(): Script {
  return async function* (_input, signal) {
    await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
    yield { type: 'error', retryable: true };
  };
}

function tool(
  name: string,
  outcome: Partial<AskToolOutcome> | ((input: unknown) => Promise<AskToolOutcome>),
  activity = ASK_ACTIVITY.Search,
): AskTool {
  return {
    definition: { name: name as AskTool['definition']['name'], description: name, inputSchema: {} },
    activity:
      name === ASK_TOOL_NAME.ShowLinks || name === ASK_TOOL_NAME.RequestDeeperAnswer
        ? null
        : activity,
    call: (_context, input) =>
      typeof outcome === 'function'
        ? outcome(input)
        : Promise.resolve({ isError: false, data: { ok: true }, found: null, ...outcome }),
  };
}

function setup(scripts: Script[], tools: AskTool[], overrides: Partial<AskLoopParams> = {}) {
  const inputs: AskRoundInput[] = [];
  const events: AskEvent[] = [];
  const provider = {
    askRound(input: AskRoundInput, signal: AbortSignal) {
      inputs.push({ ...input, messages: [...input.messages] });
      const script = scripts[inputs.length - 1] ?? answer('fallback');
      return script(input, signal);
    },
  } as unknown as AiProvider;
  const sink: AskSink = {
    closed: false,
    send: (event) => events.push(event),
    onAbort: () => undefined,
  };
  const toolbox: AskToolbox = {
    find: (name, withEscalation) =>
      !withEscalation && name === ASK_TOOL_NAME.RequestDeeperAnswer
        ? undefined
        : tools.find((t) => t.definition.name === name),
    definitions: () => tools.map((t) => t.definition),
  };
  const refs = new LinkRefs();
  refs.refFor('link-a');
  refs.refFor('link-b');
  const citations = new CitationStream((n) => refs.has(n));
  const link = (id: string) => ({ id, title: id }) as unknown as LinkResponse;
  const params: AskLoopParams = {
    provider,
    profile: ASK_MODEL_PROFILE.Quick,
    system: 'S',
    tools: toolbox,
    context: {
      user: { id: 'u' } as AskLoopParams['context']['user'],
      tier: 'ai-pack',
      includeNotes: false,
      searchReady: false,
      refs,
    },
    messages: [{ role: 'user', content: [{ type: 'text', text: '<question>q</question>' }] }],
    historyEnd: null,
    citations,
    sink,
    deadlines: DEADLINES,
    started: Date.now(),
    signal: new AbortController().signal,
    escalation: () => Promise.resolve(null),
    cards: (list) =>
      Promise.resolve(
        new Map(
          list.flatMap((ref) => {
            const id = refs.idFor(ref);
            return id ? [[ref, link(id)] as const] : [];
          }),
        ),
      ),
    ...overrides,
  };
  return { loop: new AskLoop(params), inputs, events, citations };
}

describe('AskLoop (ADR 0055 point 5)', () => {
  it('streams an answer through the citations', async () => {
    const { loop, events, citations } = setup([answer('See [1].')], []);
    const result = await loop.run();
    expect(result).toMatchObject({ outcome: 'answered', stopReason: 'done', calls: 1 });
    expect(events).toEqual([
      { type: 'text', text: 'See ' },
      { type: 'cite', n: 1 },
      { type: 'text', text: '.' },
    ]);
    expect(citations.answer).toBe('See [1].');
  });

  it('runs a tool round with activity events, then answers with the results in the transcript', async () => {
    const search = tool(ASK_TOOL_NAME.SearchLinks, {
      data: { total: 3, items: [{ title: 'a<b' }] },
      found: 3,
      search: { total: 3, refs: [1], filter: null },
    });
    const { loop, inputs, events } = setup(
      [calls({ name: ASK_TOOL_NAME.SearchLinks, thinking: true }), answer('Done.')],
      [search],
    );
    const result = await loop.run();
    expect(result.outcome).toBe('answered');
    expect(result.toolCalls).toEqual({ search_links: 1 });
    expect(result.usage).toEqual({ input: 20, cacheRead: 200, cacheWrite: 0, output: 10 });
    expect(events.slice(0, 2)).toEqual([
      { type: 'activity', activity: 'search', phase: 'start', found: null },
      { type: 'activity', activity: 'search', phase: 'end', found: 3 },
    ]);
    const second = inputs[1]?.messages ?? [];
    expect(second[1]).toMatchObject({
      role: 'assistant',
      content: [{ type: 'opaque' }, { type: 'tool_call', name: 'search_links' }],
    });
    expect(second[2]).toEqual({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          toolCallId: 't0',
          isError: false,
          content: '{"total":3,"items":[{"title":"a\\u003cb"}]}',
        },
      ],
    });
    expect(result.gathered).toEqual([
      { name: 'search_links', isError: false, data: { total: 3, items: [{ title: 'a<b' }] } },
    ]);
    expect(result.searches).toHaveLength(1);
    expect(inputs.map((input) => input.toolChoice)).toEqual(['auto', 'auto']);
  });

  it('forces the answer after the round limit', async () => {
    const search = tool(ASK_TOOL_NAME.SearchLinks, {});
    const loopCall = calls({ name: ASK_TOOL_NAME.SearchLinks });
    const { loop, inputs } = setup([loopCall, loopCall, loopCall, loopCall, loopCall], [search]);
    const result = await loop.run();
    expect(inputs.map((input) => input.toolChoice)).toEqual([
      'auto',
      'auto',
      'auto',
      'auto',
      'none',
    ]);
    expect(result).toMatchObject({ outcome: 'answered', calls: 5 });
  });

  it('forces the answer when less than the reserve is left', async () => {
    const { loop, inputs } = setup([answer('ok')], [], {
      started: Date.now() - DEADLINES.streamMaxMs + 40,
    });
    await loop.run();
    expect(inputs[0]?.toolChoice).toBe('none');
    expect(inputs[0]?.timeoutMs).toBeLessThanOrEqual(40);
  });

  it('answers extra calls of a round with an error result', async () => {
    const search = tool(ASK_TOOL_NAME.SearchLinks, {});
    const five = calls(...Array.from({ length: 5 }, () => ({ name: ASK_TOOL_NAME.SearchLinks })));
    const { loop, inputs } = setup([five, answer('ok')], [search]);
    const result = await loop.run();
    expect(result.toolCalls).toEqual({ search_links: 4 });
    const results = inputs[1]?.messages[2]?.content ?? [];
    expect(results.map((block) => (block.type === 'tool_result' ? block.isError : null))).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it('stops when a model call gives no first output in time', async () => {
    const { loop } = setup([hang()], []);
    expect((await loop.run()).outcome).toBe('first-output');
  });

  it('answers a slow tool with an error result after the tool round deadline', async () => {
    const slow = tool(
      ASK_TOOL_NAME.SearchLinks,
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ isError: false, data: 'late', found: 1 }), 1000),
        ),
    );
    const { loop, inputs, events } = setup(
      [calls({ name: ASK_TOOL_NAME.SearchLinks }), answer('ok')],
      [slow],
    );
    await loop.run();
    expect(inputs[1]?.messages[2]?.content[0]).toMatchObject({
      isError: true,
      content: 'The tool took too long; answer with what you have',
    });
    expect(events).toContainEqual({
      type: 'activity',
      activity: 'search',
      phase: 'end',
      found: null,
    });
  });

  it('turns a thrown tool into an error result and an unknown tool name into one too', async () => {
    const broken = tool(ASK_TOOL_NAME.SearchLinks, () => Promise.reject(new Error('db')));
    const { loop, inputs } = setup(
      [calls({ name: ASK_TOOL_NAME.SearchLinks }, { name: 'drop_tables' }), answer('ok')],
      [broken],
    );
    await loop.run();
    expect(inputs[1]?.messages[2]?.content).toMatchObject([
      { isError: true, content: 'The tool failed; answer with what you have' },
      { isError: true, content: 'Unknown tool' },
    ]);
  });

  it('stops on a client abort and skips pending tools', async () => {
    const controller = new AbortController();
    const slow = tool(ASK_TOOL_NAME.SearchLinks, () => {
      controller.abort();
      return new Promise(() => undefined);
    });
    const { loop, inputs } = setup(
      [calls({ name: ASK_TOOL_NAME.SearchLinks }), answer('never')],
      [slow],
      { signal: controller.signal },
    );
    expect((await loop.run()).outcome).toBe('client');
    expect(inputs).toHaveLength(1);
  });

  it('reports the hard stop when the time is up', async () => {
    const { loop } = setup([answer('x')], [], { started: Date.now() - DEADLINES.streamMaxMs - 1 });
    expect((await loop.run()).outcome).toBe('hard-stop');
  });

  it('shows cards numbered with the citations, with the search total and filter', async () => {
    const filter = { q: 'signals', folderId: null, tags: [], kind: null, favorite: false };
    const search = tool(ASK_TOOL_NAME.SearchLinks, {
      found: 14,
      search: { total: 14, refs: [2, 1], filter },
    });
    const show = tool(ASK_TOOL_NAME.ShowLinks, { show: [2, 1] });
    const { loop, events, citations } = setup(
      [
        calls({ name: ASK_TOOL_NAME.SearchLinks }),
        calls({ name: ASK_TOOL_NAME.ShowLinks, text: 'Here [1] ' }),
        answer(''),
      ],
      [search, show],
    );
    const result = await loop.run();
    expect(result.shown).toEqual([2, 1]);
    const links = events.find((event) => event.type === 'links');
    expect(links).toEqual({
      type: 'links',
      items: [
        { n: 2, link: expect.objectContaining({ id: 'link-b' }) },
        { n: 1, link: expect.objectContaining({ id: 'link-a' }) },
      ],
      total: 14,
      search: filter,
    });
    expect(citations.cited).toEqual([1, 2]);
  });

  it('ends for an accepted escalation and answers a refused one with the error text', async () => {
    const deeper = tool(ASK_TOOL_NAME.RequestDeeperAnswer, { escalate: 'synthesis' });
    const accepted = setup([calls({ name: ASK_TOOL_NAME.RequestDeeperAnswer })], [deeper]);
    expect((await accepted.loop.run()).outcome).toBe('escalate');
    const refused = setup(
      [calls({ name: ASK_TOOL_NAME.RequestDeeperAnswer }), answer('myself')],
      [deeper],
      {
        escalation: () => Promise.resolve('Not available now; answer yourself'),
      },
    );
    expect((await refused.loop.run()).outcome).toBe('answered');
    expect(refused.inputs[1]?.messages[2]?.content[0]).toMatchObject({
      isError: true,
      content: 'Not available now; answer yourself',
    });
  });

  it('never offers or runs the control tool on the deep profile', async () => {
    const deeper = tool(ASK_TOOL_NAME.RequestDeeperAnswer, { escalate: 'unsure' });
    const { loop, inputs } = setup(
      [calls({ name: ASK_TOOL_NAME.RequestDeeperAnswer }), answer('ok')],
      [deeper],
      {
        profile: ASK_MODEL_PROFILE.Deep,
      },
    );
    expect((await loop.run()).outcome).toBe('answered');
    expect(inputs[0]?.profile.depth).toBe(ASK_DEPTH.Deep);
    expect(inputs[1]?.messages[2]?.content[0]).toMatchObject({
      isError: true,
      content: 'Unknown tool',
    });
  });

  it('reports refusals and provider failures', async () => {
    const refusal: Script = async function* () {
      yield { type: 'end', stopReason: 'refusal', blocks: [], usage: USAGE };
    };
    expect((await setup([refusal], []).loop.run()).outcome).toBe('refused');
    const failure: Script = async function* () {
      yield { type: 'error', retryable: true };
    };
    expect((await setup([failure], []).loop.run()).outcome).toBe('failed');
  });
});
