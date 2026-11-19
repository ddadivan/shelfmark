import { ASK_MODEL_PROFILE } from '../models/ask-model-profile.const';
import { ASK_TOOL_NAME } from '../models/ask-tool-name.const';
import type { AskRoundChunk } from '../models/ask-round-chunk.type';
import type { AskRoundInput } from '../models/ask-round-input.interface';
import { AnthropicAiProvider, askRoundParamsFor } from './anthropic-ai.provider';
import type { AnthropicClient } from './anthropic-ai.provider';

const THINKING = { type: 'thinking', thinking: '', signature: 'sig-abc' };

const input = (overrides: Partial<AskRoundInput> = {}): AskRoundInput => ({
  profile: ASK_MODEL_PROFILE.Quick,
  system: 'SYSTEM',
  tools: [
    {
      name: ASK_TOOL_NAME.SearchLinks,
      description: 'Find links.',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        additionalProperties: false,
      },
    },
  ],
  messages: [
    { role: 'user', content: [{ type: 'text', text: '<question>first</question>' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'An earlier answer [1].' }] },
    { role: 'user', content: [{ type: 'text', text: '<question>now</question>' }] },
    {
      role: 'assistant',
      content: [
        { type: 'opaque', block: THINKING },
        { type: 'text', text: 'Let me look.' },
        { type: 'tool_call', id: 'tu_1', name: 'search_links', input: { query: 'signals' } },
      ],
    },
    {
      role: 'user',
      content: [
        { type: 'tool_result', toolCallId: 'tu_1', content: '{"total":0}', isError: false },
      ],
    },
  ],
  historyEnd: 1,
  toolChoice: 'auto',
  timeoutMs: 15000,
  ...overrides,
});

function fakeStream(events: unknown[], final: unknown, failAfter?: unknown) {
  const abort = vi.fn();
  return {
    abort,
    finalMessage: vi.fn(() => Promise.resolve(final)),
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event;
      if (failAfter !== undefined) throw failAfter;
    },
  };
}

function setup(stream: ReturnType<typeof fakeStream>) {
  const streamFn = vi.fn(() => stream);
  const client = { messages: { stream: streamFn } } as unknown as AnthropicClient;
  return { provider: new AnthropicAiProvider(client), streamFn };
}

async function collect(stream: AsyncIterable<AskRoundChunk>): Promise<AskRoundChunk[]> {
  const chunks: AskRoundChunk[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

describe('askRoundParamsFor (ADR 0055 points 1, 5, 9)', () => {
  it('pins the thinking setting per model: Haiku 5.5 disabled, Sonnet 5.5 between_tools', () => {
    const quick = askRoundParamsFor(input());
    expect(quick.model).toBe('claude-haiku-5-5');
    expect(quick.thinking).toEqual({ type: 'disabled' });
    expect(quick.output_config).toEqual({ effort: 'medium' });
    const deep = askRoundParamsFor(input({ profile: ASK_MODEL_PROFILE.Deep }));
    expect(deep.model).toBe('claude-sonnet-5-5');
    expect(deep.thinking).toEqual({ type: 'between_tools' });
    expect(deep.output_config).toEqual({ effort: 'medium' });
  });

  it('sends the tools in order with auto, or none for the forced answer with the final cap', () => {
    const auto = askRoundParamsFor(input());
    expect(auto.tool_choice).toEqual({ type: 'auto' });
    expect(auto.max_tokens).toBe(ASK_MODEL_PROFILE.Quick.roundMaxTokens);
    expect(auto.tools).toEqual([
      {
        name: 'search_links',
        description: 'Find links.',
        input_schema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          additionalProperties: false,
        },
      },
    ]);
    const forced = askRoundParamsFor(input({ toolChoice: 'none' }));
    expect(forced.tool_choice).toEqual({ type: 'none' });
    expect(forced.tools).toEqual(auto.tools);
    expect(forced.max_tokens).toBe(ASK_MODEL_PROFILE.Quick.finalMaxTokens);
  });

  it('puts cache breakpoints after the system prompt, on the last history message and the last message', () => {
    const params = askRoundParamsFor(input());
    expect(params.system).toEqual([
      { type: 'text', text: 'SYSTEM', cache_control: { type: 'ephemeral' } },
    ]);
    const marked = params.messages.flatMap((message, index) =>
      Array.isArray(message.content) &&
      message.content.some((block) => 'cache_control' in block && block.cache_control)
        ? [index]
        : [],
    );
    expect(marked).toEqual([1, 4]);
    const history = askRoundParamsFor(input({ historyEnd: null }));
    expect(
      history.messages.filter(
        (message) =>
          Array.isArray(message.content) &&
          message.content.some((block) => 'cache_control' in block),
      ),
    ).toHaveLength(1);
  });

  it('sends thinking blocks back unchanged, tool calls and results in API shape', () => {
    const params = askRoundParamsFor(input());
    expect(params.messages[3]).toEqual({
      role: 'assistant',
      content: [
        THINKING,
        { type: 'text', text: 'Let me look.' },
        { type: 'tool_use', id: 'tu_1', name: 'search_links', input: { query: 'signals' } },
      ],
    });
    expect(params.messages[4]).toEqual({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tu_1',
          content: '{"total":0}',
          is_error: false,
          cache_control: { type: 'ephemeral' },
        },
      ],
    });
  });
});

describe('AnthropicAiProvider.askRound', () => {
  it('streams text and tool starts, then ends with the blocks unchanged and the usage', async () => {
    const final = {
      stop_reason: 'tool_use',
      content: [
        THINKING,
        { type: 'text', text: 'Looking.' },
        { type: 'tool_use', id: 'tu_2', name: 'count_links', input: { groupBy: 'month' } },
      ],
      usage: {
        input_tokens: 120,
        cache_read_input_tokens: 2500,
        cache_creation_input_tokens: 300,
        output_tokens: 40,
      },
    };
    const { provider, streamFn } = setup(
      fakeStream(
        [
          {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'thinking', thinking: '' },
          },
          {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'thinking_delta', thinking: 'secret' },
          },
          {
            type: 'content_block_delta',
            index: 1,
            delta: { type: 'text_delta', text: 'Looking.' },
          },
          {
            type: 'content_block_start',
            index: 2,
            content_block: { type: 'tool_use', id: 'tu_2', name: 'count_links', input: {} },
          },
        ],
        final,
      ),
    );
    const controller = new AbortController();
    const chunks = await collect(provider.askRound(input({ timeoutMs: 9000 }), controller.signal));
    expect(chunks).toEqual([
      { type: 'text', text: 'Looking.' },
      { type: 'tool_start', name: 'count_links' },
      {
        type: 'end',
        stopReason: 'tool-use',
        blocks: [
          { type: 'opaque', block: THINKING },
          { type: 'text', text: 'Looking.' },
          { type: 'tool_call', id: 'tu_2', name: 'count_links', input: { groupBy: 'month' } },
        ],
        usage: { input: 120, cacheRead: 2500, cacheWrite: 300, output: 40 },
      },
    ]);
    expect(JSON.stringify(chunks.slice(0, 2))).not.toContain('secret');
    expect(streamFn).toHaveBeenCalledWith(expect.any(Object), {
      timeout: 9000,
      maxRetries: 0,
      signal: controller.signal,
    });
  });

  it('maps stop reasons and failures', async () => {
    const usage = { input_tokens: 1, output_tokens: 1 };
    for (const [reason, expected] of [
      ['end_turn', 'done'],
      ['refusal', 'refusal'],
      ['max_tokens', 'max-tokens'],
    ] as const) {
      const { provider } = setup(fakeStream([], { stop_reason: reason, content: [], usage }));
      const chunks = await collect(provider.askRound(input(), new AbortController().signal));
      expect(chunks.at(-1)).toMatchObject({ type: 'end', stopReason: expected });
    }
    const failing = setup(fakeStream([], null, Object.assign(new Error('x'), { status: 400 })));
    expect(await collect(failing.provider.askRound(input(), new AbortController().signal))).toEqual(
      [{ type: 'error', retryable: false }],
    );
    const network = setup(fakeStream([], null, new Error('socket')));
    expect(await collect(network.provider.askRound(input(), new AbortController().signal))).toEqual(
      [{ type: 'error', retryable: true }],
    );
  });

  it('aborts the SDK stream when the consumer stops early', async () => {
    const stream = fakeStream(
      [
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'a' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'b' } },
      ],
      { stop_reason: 'end_turn', content: [], usage: { input_tokens: 1, output_tokens: 1 } },
    );
    const { provider } = setup(stream);
    for await (const chunk of provider.askRound(input(), new AbortController().signal)) {
      expect(chunk.type).toBe('text');
      break;
    }
    expect(stream.abort).toHaveBeenCalled();
  });
});
