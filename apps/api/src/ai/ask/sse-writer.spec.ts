import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { SseWriter } from './sse-writer';

class FakeResponse extends EventEmitter {
  headers: Record<string, string> = {};
  statusCode = 0;
  written: string[] = [];
  flushed = false;
  ended = 0;
  destroyed = false;
  writableFinished = false;

  status(code: number) {
    this.statusCode = code;
    return this;
  }
  setHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  flushHeaders() {
    this.flushed = true;
  }
  write(chunk: string) {
    this.written.push(chunk);
    return true;
  }
  end() {
    this.ended += 1;
    this.writableFinished = true;
  }
}

const setup = () => {
  const res = new FakeResponse();
  return { res, writer: new SseWriter(res as unknown as Response) };
};

describe('SseWriter', () => {
  it('sets the stream headers and flushes them at once', () => {
    const { res } = setup();
    expect(res.statusCode).toBe(200);
    expect(res.headers).toEqual({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    expect(res.flushed).toBe(true);
  });

  it('writes one data line per event; newlines inside text cannot break the framing', () => {
    const { res, writer } = setup();
    writer.send({ type: 'text', text: 'line one\n\ndata: {"type":"done"}' });
    writer.send({ type: 'cite', n: 1 });
    expect(res.written).toEqual([
      'data: {"type":"text","text":"line one\\n\\ndata: {\\"type\\":\\"done\\"}"}\n\n',
      'data: {"type":"cite","n":1}\n\n',
    ]);
  });

  it('ignores writes after end and ends once', () => {
    const { res, writer } = setup();
    writer.end();
    writer.end();
    writer.send({ type: 'cite', n: 1 });
    expect(res.ended).toBe(1);
    expect(res.written).toEqual([]);
    expect(writer.closed).toBe(true);
    res.emit('close');
  });

  it('tells its listeners when the client goes away, and ignores later writes', () => {
    const { res, writer } = setup();
    const listener = vi.fn();
    writer.onAbort(listener);
    res.emit('close');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(writer.closed).toBe(true);
    writer.send({ type: 'cite', n: 1 });
    expect(res.written).toEqual([]);
    const late = vi.fn();
    writer.onAbort(late);
    expect(late).toHaveBeenCalledTimes(1);
    writer.end();
    expect(res.ended).toBe(1);
  });

  it('does not end a destroyed response and treats it as closed', () => {
    const { res, writer } = setup();
    res.destroyed = true;
    expect(writer.closed).toBe(true);
    writer.end();
    expect(res.ended).toBe(0);
  });
});
