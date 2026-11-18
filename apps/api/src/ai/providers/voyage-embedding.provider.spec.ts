import { VOYAGE_LIMIT } from '../models/voyage-limit.const';
import type { EmbeddingFetch } from '../models/embedding-fetch.type';
import { parseVoyageResponse, VoyageEmbeddingProvider } from './voyage-embedding.provider';

const KEY = 'voyage'.padEnd(20, 'x');

function vector(fill = 0.01, length = 1024): number[] {
  return new Array<number>(length).fill(fill);
}

function answer(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function okBody(count: number): unknown {
  return {
    object: 'list',
    data: Array.from({ length: count }, (_, index) => ({
      object: 'embedding',
      embedding: vector(index + 1),
      index,
    })),
    model: 'voyage-4-lite',
    usage: { total_tokens: 12 },
  };
}

function setup(respond: (url: string, init: RequestInit) => Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn: EmbeddingFetch = (url, init) => {
    calls.push({ url, init });
    return respond(url, init);
  };
  return { provider: new VoyageEmbeddingProvider(KEY, fetchFn), calls };
}

describe('VoyageEmbeddingProvider', () => {
  it('posts the pinned request and returns the vectors in input order', async () => {
    const body = okBody(2) as { data: unknown[] };
    body.data.reverse();
    const { provider, calls } = setup(() => Promise.resolve(answer(body)));
    const outcome = await provider.embed(['first', 'second'], 'document');
    expect(outcome).toEqual({ ok: true, vectors: [vector(1), vector(2)], tokens: 12 });
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe('https://api.voyageai.com/v1/embeddings');
    expect(call?.init).toMatchObject({ method: 'POST', redirect: 'error' });
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
    expect(call?.init.headers).toMatchObject({
      authorization: `Bearer ${KEY}`,
      'content-type': 'application/json',
    });
    expect(JSON.parse(String(call?.init.body))).toEqual({
      input: ['first', 'second'],
      model: 'voyage-4-lite',
      input_type: 'document',
      output_dimension: 1024,
      output_dtype: 'float',
      truncation: true,
    });
    expect(provider).toMatchObject({ name: 'voyage', model: 'voyage-4-lite', dimensions: 1024 });
    expect(provider.minSimilarity).toBe(VOYAGE_LIMIT.MinSimilarity);
  });

  it('sends queries as query and uses the shorter timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const { provider, calls } = setup(() => Promise.resolve(answer(okBody(1))));
    await provider.embed(['coat'], 'query');
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({ input_type: 'query' });
    expect(timeout).toHaveBeenCalledWith(VOYAGE_LIMIT.QueryTimeoutMs);
    await provider.embed(['coat'], 'document');
    expect(timeout).toHaveBeenLastCalledWith(VOYAGE_LIMIT.DocumentTimeoutMs);
    timeout.mockRestore();
  });

  it('answers nothing without a call for no texts and refuses an oversized batch', async () => {
    const { provider, calls } = setup(() => Promise.resolve(answer(okBody(1))));
    await expect(provider.embed([], 'document')).resolves.toEqual({
      ok: true,
      vectors: [],
      tokens: 0,
    });
    await expect(provider.embed(new Array<string>(65).fill('x'), 'document')).resolves.toEqual({
      ok: false,
      retryable: false,
    });
    expect(calls).toHaveLength(0);
  });

  it.each([
    [429, true],
    [500, true],
    [503, true],
    [408, true],
    [400, false],
    [401, false],
    [403, false],
  ])('maps HTTP %i to retryable=%s', async (status, retryable) => {
    const { provider } = setup(() => Promise.resolve(answer({ detail: 'nope' }, { status })));
    await expect(provider.embed(['a'], 'document')).resolves.toEqual({ ok: false, retryable });
  });

  it('treats a network failure, a timeout and a refused redirect as retryable', async () => {
    for (const error of [
      new TypeError('fetch failed'),
      new DOMException('timed out', 'TimeoutError'),
      new TypeError('unexpected redirect'),
    ]) {
      const { provider } = setup(() => Promise.reject(error));
      await expect(provider.embed(['a'], 'document')).resolves.toEqual({
        ok: false,
        retryable: true,
      });
    }
  });

  it('refuses an oversized answer by header and while streaming', async () => {
    const big = { headers: { 'content-length': String(VOYAGE_LIMIT.MaxResponseBytes + 1) } };
    const byHeader = setup(() => Promise.resolve(answer(okBody(1), big)));
    await expect(byHeader.provider.embed(['a'], 'document')).resolves.toEqual({
      ok: false,
      retryable: false,
    });
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        if (sent > 5) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const streaming = setup(() => Promise.resolve(new Response(stream, { status: 200 })));
    await expect(streaming.provider.embed(['a'], 'document')).resolves.toEqual({
      ok: false,
      retryable: false,
    });
  });

  it('answers retryable when the body stream breaks, final for an empty or non-JSON body', async () => {
    const broken = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error('reset'));
      },
    });
    const a = setup(() => Promise.resolve(new Response(broken, { status: 200 })));
    await expect(a.provider.embed(['a'], 'document')).resolves.toEqual({
      ok: false,
      retryable: true,
    });
    const b = setup(() => Promise.resolve(new Response('not json', { status: 200 })));
    await expect(b.provider.embed(['a'], 'document')).resolves.toEqual({
      ok: false,
      retryable: false,
    });
    const c = setup(() => Promise.resolve(new Response(null, { status: 200 })));
    await expect(c.provider.embed(['a'], 'document')).resolves.toEqual({
      ok: false,
      retryable: false,
    });
  });

  it('never puts the key or the texts into an outcome', async () => {
    const { provider } = setup(() => Promise.resolve(answer({ detail: KEY }, { status: 401 })));
    const outcome = await provider.embed(['secret text'], 'document');
    expect(JSON.stringify(outcome)).not.toContain(KEY);
    expect(JSON.stringify(outcome)).not.toContain('secret text');
  });

  it('calls globalThis.fetch per call when no fetch is injected (guarded in tests)', async () => {
    const provider = new VoyageEmbeddingProvider(KEY);
    // vitest.setup.ts makes any request to the Voyage host throw; the provider maps it.
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(answer(okBody(1))));
    await expect(provider.embed(['a'], 'query')).resolves.toMatchObject({ ok: true });
    expect(spy).toHaveBeenCalledWith(VOYAGE_LIMIT.Url, expect.any(Object));
    spy.mockRestore();
  });
});

describe('parseVoyageResponse', () => {
  it('accepts exactly one finite vector of the right length per input', () => {
    expect(parseVoyageResponse(okBody(2), 2, 1024)?.vectors).toHaveLength(2);
    expect(parseVoyageResponse({ data: [{ index: 0, embedding: [1, 2] }] }, 1, 2)).toEqual({
      vectors: [[1, 2]],
      tokens: 0,
    });
  });

  it.each([
    ['not an object', null],
    ['no data', {}],
    ['too few vectors', { data: [{ index: 0, embedding: [1, 2] }] }],
    [
      'a short vector',
      {
        data: [
          { index: 0, embedding: [1] },
          { index: 1, embedding: [1, 2] },
        ],
      },
    ],
    [
      'NaN',
      {
        data: [
          { index: 0, embedding: [Number.NaN, 1] },
          { index: 1, embedding: [1, 2] },
        ],
      },
    ],
    [
      'a string',
      {
        data: [
          { index: 0, embedding: ['1', 1] },
          { index: 1, embedding: [1, 2] },
        ],
      },
    ],
    [
      'a duplicate index',
      {
        data: [
          { index: 0, embedding: [1, 2] },
          { index: 0, embedding: [1, 2] },
        ],
      },
    ],
    [
      'an index out of range',
      {
        data: [
          { index: 0, embedding: [1, 2] },
          { index: 2, embedding: [1, 2] },
        ],
      },
    ],
    [
      'a fractional index',
      {
        data: [
          { index: 0, embedding: [1, 2] },
          { index: 0.5, embedding: [1, 2] },
        ],
      },
    ],
    ['a non-object item', { data: [{ index: 0, embedding: [1, 2] }, 7] }],
  ])('refuses %s', (_, body) => {
    expect(parseVoyageResponse(body, 2, 2)).toBeNull();
  });

  it('reads the token count only when it is a sane number', () => {
    const data = [{ index: 0, embedding: [1, 2] }];
    expect(parseVoyageResponse({ data, usage: { total_tokens: -3 } }, 1, 2)?.tokens).toBe(0);
    expect(parseVoyageResponse({ data, usage: { total_tokens: 9 } }, 1, 2)?.tokens).toBe(9);
  });
});
