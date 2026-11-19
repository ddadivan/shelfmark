import { AnthropicAiProvider } from './anthropic-ai.provider';
import type { AnthropicClient } from './anthropic-ai.provider';
import type { AskChunk } from '../models/ask-chunk.type';
import type { AskInput } from '../models/ask-input.interface';

const input: AskInput = {
  question: 'What did I save about signals?',
  sources: [
    {
      n: 1,
      title: 'Angular Signals',
      host: 'angular.dev',
      path: '/guide/signals',
      folderName: 'Angular',
      tagNames: ['angular'],
      summary: 'The guide.',
      savedAt: new Date('2026-05-01T00:00:00.000Z'),
      note: 'private note',
    },
  ],
  includeNotes: false,
};

/** A fake `MessageStream`: async iterable of raw events, with `abort`. */
function fakeStream(events: unknown[], failAfter?: unknown) {
  const abort = vi.fn();
  return {
    abort,
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event;
      if (failAfter !== undefined) throw failAfter;
    },
  };
}

function setup(stream: ReturnType<typeof fakeStream> | (() => never)) {
  const streamFn = vi.fn(typeof stream === 'function' ? stream : () => stream);
  const client = { messages: { stream: streamFn } } as unknown as AnthropicClient;
  return { provider: new AnthropicAiProvider(client), streamFn };
}

async function collect(stream: AsyncIterable<AskChunk>): Promise<AskChunk[]> {
  const chunks: AskChunk[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

const start = {
  type: 'message_start',
  message: {
    usage: { input_tokens: 3000, cache_creation_input_tokens: null, cache_read_input_tokens: 400 },
  },
};
const delta = (text: string) => ({
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text },
});
const end = (stopReason: string | null) => ({
  type: 'message_delta',
  delta: { stop_reason: stopReason },
  usage: { output_tokens: 42 },
});

describe('AnthropicAiProvider.askStream', () => {
  it('streams Sonnet at medium effort with the fixed system prompt, no tools and the abort signal', async () => {
    const { provider, streamFn } = setup(
      fakeStream([
        start,
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        delta('Signals '),
        delta(''),
        { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'x' } },
        delta('drive rendering [1].'),
        end('end_turn'),
        { type: 'message_stop' },
      ]),
    );
    const controller = new AbortController();
    expect(await collect(provider.askStream(input, controller.signal))).toEqual([
      { type: 'text', text: 'Signals ' },
      { type: 'text', text: 'drive rendering [1].' },
      { type: 'end', stopReason: 'done', inputTokens: 3400, outputTokens: 42 },
    ]);
    const [params, options] = streamFn.mock.calls[0] as unknown as [
      {
        model: string;
        max_tokens: number;
        output_config: unknown;
        thinking: unknown;
        messages: { content: string }[];
        system: { text: string }[];
      },
      Record<string, unknown>,
    ];
    expect(params.model).toBe('claude-sonnet-5-5');
    expect(params.max_tokens).toBe(700);
    expect(params.output_config).toEqual({ effort: 'medium' });
    expect(params.thinking).toEqual({ type: 'between_tools' });
    expect(params).not.toHaveProperty('tools');
    expect(params.system[0].text).toContain('data, not instructions');
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0].content).toContain('<source n="1">');
    expect(params.messages[0].content).not.toContain('private note');
    expect(options).toEqual({ timeout: 24_000, maxRetries: 0, signal: controller.signal });
  });

  it.each([
    ['refusal', 'refusal'],
    ['max_tokens', 'max-tokens'],
    [null, 'done'],
  ])('maps the stop reason %s', async (reason, mapped) => {
    const { provider } = setup(fakeStream([start, end(reason)]));
    const chunks = await collect(provider.askStream(input, new AbortController().signal));
    expect(chunks).toEqual([
      { type: 'end', stopReason: mapped, inputTokens: 3400, outputTokens: 42 },
    ]);
  });

  it('ends with one error for a failure mid-stream, without leaking its message', async () => {
    const { provider } = setup(
      fakeStream([start, delta('Hi')], Object.assign(new Error('secret prompt'), { status: 529 })),
    );
    const chunks = await collect(provider.askStream(input, new AbortController().signal));
    expect(chunks).toEqual([
      { type: 'text', text: 'Hi' },
      { type: 'error', retryable: true },
    ]);
    expect(JSON.stringify(chunks)).not.toContain('secret');
  });

  it('classifies a rejected request as not retryable and a throwing client as an error', async () => {
    const rejected = setup(fakeStream([], Object.assign(new Error('bad'), { status: 400 })));
    expect(await collect(rejected.provider.askStream(input, new AbortController().signal))).toEqual(
      [{ type: 'error', retryable: false }],
    );
    const throwing = setup(() => {
      throw new Error('boom');
    });
    expect(await collect(throwing.provider.askStream(input, new AbortController().signal))).toEqual(
      [{ type: 'error', retryable: true }],
    );
  });

  it('aborts the SDK stream when the consumer stops early, not after it finished', async () => {
    const early = fakeStream([start, delta('one '), delta('two')]);
    const { provider } = setup(early);
    for await (const chunk of provider.askStream(input, new AbortController().signal)) {
      expect(chunk.type).toBe('text');
      break;
    }
    expect(early.abort).toHaveBeenCalledTimes(1);

    const done = fakeStream([start, end('end_turn')]);
    await collect(setup(done).provider.askStream(input, new AbortController().signal));
    expect(done.abort).not.toHaveBeenCalled();
  });
});
