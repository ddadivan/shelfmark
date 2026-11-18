import { HttpErrorResponse } from '@angular/common/http';
import type { AskEvent } from '@shelfmark/contracts';
import { fetchAskEvents } from './fetch-ask-events';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function collect(
  fetchFn: typeof fetch,
): Promise<{ events: AskEvent[]; error: unknown; completed: boolean }> {
  return new Promise((resolve) => {
    const events: AskEvent[] = [];
    fetchAskEvents('/api/ai/ask', { question: 'ramen?' }, fetchFn).subscribe({
      next: (event) => events.push(event),
      error: (error: unknown) => resolve({ events, error, completed: false }),
      complete: () => resolve({ events, error: null, completed: true }),
    });
  });
}

describe('fetchAskEvents', () => {
  it('posts the question as JSON with same-origin credentials and reads the stream', async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () =>
        new Response(
          streamOf(['data: {"type":"text","te', 'xt":"Hi"}\n\ndata: {"type":"cite","n":1}\n\n']),
          {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          },
        ),
    );
    const { events, completed } = await collect(fetchFn);
    expect(events).toEqual([
      { type: 'text', text: 'Hi' },
      { type: 'cite', n: 1 },
    ]);
    expect(completed).toBe(true);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe('/api/ai/ask');
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({ question: 'ramen?' }),
    });
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('errors with the status for a refused request', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => new Response('{}', { status: 429 }));
    const { error } = await collect(fetchFn);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(429);
  });

  it('errors when the connection breaks', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError('network');
    });
    const { error } = await collect(fetchFn);
    expect(error).toBeInstanceOf(TypeError);
  });

  it('aborts the request on unsubscribe and stays quiet', async () => {
    let signal: AbortSignal | undefined;
    const fetchFn = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init?.signal ?? undefined;
          signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const error = vi.fn();
    const subscription = fetchAskEvents('/api/ai/ask', { question: 'x?' }, fetchFn).subscribe({
      error,
    });
    subscription.unsubscribe();
    await Promise.resolve();
    await Promise.resolve();
    expect(signal?.aborted).toBe(true);
    expect(error).not.toHaveBeenCalled();
  });
});
