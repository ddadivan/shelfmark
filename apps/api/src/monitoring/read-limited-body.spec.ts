import { PayloadTooLargeException } from '@nestjs/common';
import type { Request } from 'express';
import { Readable } from 'node:stream';
import { readLimitedBody } from './read-limited-body';

function fakeRequest(chunks: (Buffer | string)[], headers: Record<string, string> = {}): Request {
  return Object.assign(Readable.from(chunks), { headers }) as unknown as Request;
}

describe('readLimitedBody', () => {
  it('joins the chunks of a small body', async () => {
    const body = await readLimitedBody(fakeRequest([Buffer.from('ab'), 'cd']), 10);
    expect(body.toString()).toBe('abcd');
  });

  it('rejects early on a declared length above the limit', async () => {
    await expect(
      readLimitedBody(fakeRequest(['a'], { 'content-length': '11' }), 10),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('rejects a streamed body above the limit without a content length', async () => {
    await expect(
      readLimitedBody(fakeRequest([Buffer.alloc(6), Buffer.alloc(6)]), 10),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});
