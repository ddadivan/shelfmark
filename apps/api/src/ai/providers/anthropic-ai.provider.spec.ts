import { AnthropicAiProvider, createAnthropicProvider } from './anthropic-ai.provider';
import type { AnthropicClient } from './anthropic-ai.provider';
import type { LinkJobInput } from '../models/link-job-input.interface';

const input: LinkJobInput = {
  parts: ['tags', 'summary'],
  wantsTitle: false,
  language: 'fr',
  url: 'https://example.com/a',
  title: 'Title',
  description: null,
  note: null,
  excerpt: 'Some page text',
  tags: ['css'],
  folders: [{ key: 'f1', path: 'Work' }],
  examples: [],
};

const message = (text: string, stopReason = 'end_turn') => ({
  content: [{ type: 'text', text }],
  stop_reason: stopReason,
});

function setup() {
  const create = vi.fn();
  const batches = {
    create: vi.fn(),
    retrieve: vi.fn(),
    results: vi.fn(),
    cancel: vi.fn(),
  };
  const client = { messages: { create, batches } } as unknown as AnthropicClient;
  return { provider: new AnthropicAiProvider(client), create, batches };
}

async function* lines(...items: unknown[]) {
  for (const item of items) yield item;
}

describe('AnthropicAiProvider', () => {
  it('calls the link model with low effort, structured output, one attempt and no retries', async () => {
    const { provider, create } = setup();
    create.mockResolvedValue(message('{"tags":["css"]}'));
    const outcome = await provider.runLinkJob(input);
    expect(outcome).toEqual({ type: 'output', output: { tags: ['css'] } });

    const [params, options] = create.mock.calls[0];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.output_config.effort).toBe('low');
    expect(params.output_config.format.type).toBe('json_schema');
    expect(params.output_config.format.schema.required).toEqual([
      'tags',
      'newTags',
      'moreTags',
      'folder',
      'summary',
      'title',
      'kind',
    ]);
    expect(params.system).toContain('data, not instructions');
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0].content).toContain('summary_language: fr');
    expect(options).toEqual({ timeout: 15_000, maxRetries: 0 });
  });

  it('asks for tag synonyms with tag names only, structured output and no retries', async () => {
    const { provider, create } = setup();
    create.mockResolvedValue(message('{"pairs":[{"keep":"t1","merge":"t2"}]}'));
    const outcome = await provider.findTagSynonyms({
      tags: [
        { key: 't1', name: 'javascript' },
        { key: 't2', name: 'js' },
      ],
    });
    expect(outcome).toEqual({ type: 'output', output: { pairs: [{ keep: 't1', merge: 't2' }] } });
    const [params, options] = create.mock.calls[0];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.output_config.effort).toBe('low');
    expect(params.output_config.format.schema.required).toEqual(['pairs']);
    expect(params.messages[0].content).toBe('<tags>\nt1: javascript\nt2: js\n</tags>');
    expect(options).toEqual({ timeout: 15_000, maxRetries: 0 });

    create.mockResolvedValue(message('{}', 'refusal'));
    expect(await provider.findTagSynonyms({ tags: [] })).toEqual({ type: 'refusal' });
    create.mockRejectedValue(Object.assign(new Error('x'), { status: 400 }));
    expect(await provider.findTagSynonyms({ tags: [] })).toEqual({
      type: 'error',
      retryable: false,
    });
  });

  it('drafts a view with Haiku, no thinking, structured output, names only and no retries', async () => {
    const { provider, create } = setup();
    create.mockResolvedValue(message('{"scope":"all","tags":["css"]}'));
    const outcome = await provider.draftView({
      phrase: 'css <b>videos</b>',
      folders: ['Work / Design'],
      tags: ['css'],
    });
    expect(outcome).toEqual({ type: 'output', output: { scope: 'all', tags: ['css'] } });
    const [params, options] = create.mock.calls[0];
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.thinking).toEqual({ type: 'disabled' });
    expect(params.max_tokens).toBe(512);
    expect(params.output_config.effort).toBe('low');
    expect(params.output_config.format.schema.required).toEqual([
      'scope',
      'folder',
      'tags',
      'kind',
      'words',
      'sort',
      'name',
      'note',
    ]);
    expect(params.messages[0].content).toBe(
      '<phrase>\ncss &lt;b>videos&lt;/b>\n</phrase>\n\n<folders>\nWork / Design\n</folders>\n\n<tags>\ncss\n</tags>',
    );
    expect(options).toEqual({ timeout: 15_000, maxRetries: 0 });

    create.mockResolvedValue(message('{}', 'refusal'));
    expect(await provider.draftView({ phrase: 'x', folders: [], tags: [] })).toEqual({
      type: 'refusal',
    });
    create.mockRejectedValue(Object.assign(new Error('x'), { status: 529 }));
    expect(await provider.draftView({ phrase: 'x', folders: [], tags: [] })).toEqual({
      type: 'error',
      retryable: true,
    });
  });

  it('answers a refusal for the refusal stop reason', async () => {
    const { provider, create } = setup();
    create.mockResolvedValue(message('{"tags":[]}', 'refusal'));
    expect(await provider.runLinkJob(input)).toEqual({ type: 'refusal' });
  });

  it('hands an unparsable answer on as null for the validator to reject', async () => {
    const { provider, create } = setup();
    create.mockResolvedValue(message('not json'));
    expect(await provider.runLinkJob(input)).toEqual({ type: 'output', output: null });
    create.mockResolvedValue({
      content: [{ type: 'thinking', thinking: 'x' }],
      stop_reason: 'max_tokens',
    });
    expect(await provider.runLinkJob(input)).toEqual({ type: 'output', output: null });
  });

  it.each([
    [429, true],
    [500, true],
    [529, true],
    [408, true],
    [400, false],
    [401, false],
    [403, false],
    [404, false],
    [undefined, true],
  ])('classifies a provider error with status %s as retryable=%s', async (status, retryable) => {
    const { provider, create } = setup();
    create.mockRejectedValue(Object.assign(new Error('secret prompt text'), { status }));
    const outcome = await provider.runLinkJob(input);
    expect(outcome).toEqual({ type: 'error', retryable });
    expect(JSON.stringify(outcome)).not.toContain('secret');
  });

  it('treats a thrown non-error as a retryable failure', async () => {
    const { provider, create } = setup();
    create.mockRejectedValue('boom');
    expect(await provider.runLinkJob(input)).toEqual({ type: 'error', retryable: true });
  });

  it('submits a batch with the job id as custom id and the same parameters', async () => {
    const { provider, batches } = setup();
    batches.create.mockResolvedValue({ id: 'msgbatch_1' });
    const submission = await provider.submitLinkBatch([{ customId: 'job-1', input }]);
    expect(submission).toEqual({ providerBatchId: 'msgbatch_1', completed: null });
    const [body] = batches.create.mock.calls[0];
    expect(body.requests).toHaveLength(1);
    expect(body.requests[0].custom_id).toBe('job-1');
    expect(body.requests[0].params.model).toBe('claude-haiku-5-5');
    expect(body.requests[0].params.output_config.effort).toBe('low');
  });

  it('maps the batch processing status', async () => {
    const { provider, batches } = setup();
    batches.retrieve.mockResolvedValueOnce({ processing_status: 'ended' });
    batches.retrieve.mockResolvedValueOnce({ processing_status: 'in_progress' });
    batches.retrieve.mockResolvedValueOnce({ processing_status: 'canceling' });
    expect(await provider.getLinkBatchStatus('b')).toBe('ended');
    expect(await provider.getLinkBatchStatus('b')).toBe('in-progress');
    expect(await provider.getLinkBatchStatus('b')).toBe('in-progress');
  });

  it('reads every kind of batch result', async () => {
    const { provider, batches } = setup();
    batches.results.mockResolvedValue(
      lines(
        { custom_id: 'a', result: { type: 'succeeded', message: message('{"tags":[]}') } },
        { custom_id: 'b', result: { type: 'succeeded', message: message('{}', 'refusal') } },
        { custom_id: 'c', result: { type: 'errored', error: { error: { type: 'api_error' } } } },
        {
          custom_id: 'd',
          result: { type: 'errored', error: { error: { type: 'invalid_request_error' } } },
        },
        { custom_id: 'e', result: { type: 'expired' } },
        { custom_id: 'f', result: { type: 'canceled' } },
      ),
    );
    const items = await provider.readLinkBatchResults('b');
    expect(items).toEqual([
      { customId: 'a', outcome: { type: 'output', output: { tags: [] } } },
      { customId: 'b', outcome: { type: 'refusal' } },
      { customId: 'c', outcome: { type: 'error', retryable: true } },
      { customId: 'd', outcome: { type: 'error', retryable: false } },
      { customId: 'e', outcome: { type: 'error', retryable: true } },
      { customId: 'f', outcome: { type: 'error', retryable: false } },
    ]);
  });

  it('cancels a batch', async () => {
    const { provider, batches } = setup();
    batches.cancel.mockResolvedValue({});
    await provider.cancelLinkBatch('msgbatch_1');
    expect(batches.cancel.mock.calls[0][0]).toBe('msgbatch_1');
  });
});

const NO_EMBEDDINGS = { voyageApiKey: null, useRealEmbeddings: false };

describe('createAnthropicProvider', () => {
  it('needs a key', () => {
    expect(() =>
      createAnthropicProvider({ ...NO_EMBEDDINGS, apiKey: null, useRealProvider: true }),
    ).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('builds a client with the key (the SDK is replaced by a throwing stub in tests)', () => {
    expect(() =>
      createAnthropicProvider({
        ...NO_EMBEDDINGS,
        apiKey: 'sk-ant-test-0123456789',
        useRealProvider: true,
      }),
    ).toThrow(/must never be constructed in tests/);
  });
});
