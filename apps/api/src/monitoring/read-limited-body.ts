import { PayloadTooLargeException } from '@nestjs/common';
import type { Request } from 'express';

/** Reads the raw request body, refusing anything above `maxBytes` before buffering it all. */
export async function readLimitedBody(req: Request, maxBytes: number): Promise<Buffer> {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) throw new PayloadTooLargeException();

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer);
    size += buffer.length;
    if (size > maxBytes) throw new PayloadTooLargeException();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
